import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  MenuItem,
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useNavigate, useParams } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { productApi, Product, PackagingProduct, WideFormatProduct, LeafletsProduct } from '../services/productApi';
import { jobApi, JobItem } from '../services/jobApi';
import { useSnackbar } from 'notistack';

interface JobFormData {
  customer_name: string;
  items: JobItem[];
  notes?: string;
  total_cost: number;
  status: 'pending' | 'in_progress' | 'artwork_issue' | 'client_approval' | 'completed' | 'cancelled';
  due_date?: string;
  // work_completed is handled separately, not part of the form data
}

const initialJobItem: Omit<JobItem, 'product_name' | 'product_category'> = {
  product_id: 0,
  quantity: 1,
  unit_price: 0,
  total_price: 0,
};

const CreateJob = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [packagingProducts, setPackagingProducts] = useState<PackagingProduct[]>([]);
  const [wideFormatProducts, setWideFormatProducts] = useState<WideFormatProduct[]>([]);
  const [leafletsProducts, setLeafletsProducts] = useState<LeafletsProduct[]>([]);
  
  const [formData, setFormData] = useState<JobFormData>({
    customer_name: '',
    items: [],
    notes: '',
    total_cost: 0,
    status: 'pending',
    due_date: '',
  });

  // Load all products and job data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const allProducts = await productApi.getAllProducts();
        setProducts(allProducts);
        
        // Separate products by category
        setPackagingProducts(allProducts.filter(p => p.category === 'packaging') as PackagingProduct[]);
        setWideFormatProducts(allProducts.filter(p => p.category === 'wide_format') as WideFormatProduct[]);
        setLeafletsProducts(allProducts.filter(p => p.category === 'leaflets') as LeafletsProduct[]);
        
        // If in edit mode, fetch job data
        if (isEditMode && id) {
          setLoading(true);
          const jobData = await jobApi.getJobById(parseInt(id));
          
          // Set form data from job
          setFormData({
            customer_name: jobData.customer_name,
            items: jobData.items || [],
            notes: jobData.notes || '',
            total_cost: jobData.total_cost,
            status: jobData.status,
            due_date: jobData.due_date || '',
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        enqueueSnackbar('Failed to load data', { variant: 'error' });
        setLoading(false);
      }
    };
    
    fetchData();
  }, [enqueueSnackbar, id, isEditMode]);

  // Add a new item to the job
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialJobItem } as JobItem],
    }));
  };

  // Remove an item from the job
  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_cost: calculateTotalCost(newItems),
    }));
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    const newItems = [...formData.items];
    
    // Initialize item with product data
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      product_name: selectedProduct.name,
      product_category: selectedProduct.category,
      unit_price: getUnitPrice(selectedProduct),
      total_price: calculateItemTotal(selectedProduct, newItems[index].quantity, newItems[index]),
    };
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_cost: calculateTotalCost(newItems),
    }));
  };

  // Handle product category selection
  const handleCategorySelect = (index: number, category: Product['category']) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      product_category: category,
      product_id: 0, // Reset product when category changes
      total_price: 0,
      unit_price: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_cost: calculateTotalCost(newItems),
    }));
  };

  // Get unit price based on product type
  const getUnitPrice = (product: Product): number => {
    switch (product.category) {
      case 'packaging': {
        const packagingProduct = product as PackagingProduct;
        // Calculate unit cost if it's zero but we have box cost and units per box
        if ((packagingProduct.unit_cost === 0 || !packagingProduct.unit_cost) && 
            packagingProduct.box_cost && 
            packagingProduct.units_per_box) {
          return packagingProduct.box_cost / packagingProduct.units_per_box;
        }
        return packagingProduct.unit_cost || 0;
      }
      case 'wide_format': {
        const wideFormatProduct = product as WideFormatProduct;
        // Calculate cost per sqm if it's zero but we have roll cost, width and length
        if ((wideFormatProduct.cost_per_sqm === 0 || !wideFormatProduct.cost_per_sqm) && 
            wideFormatProduct.roll_cost && 
            wideFormatProduct.width_m && 
            wideFormatProduct.length_m) {
          const area = wideFormatProduct.width_m * wideFormatProduct.length_m;
          return wideFormatProduct.roll_cost / area;
        }
        return wideFormatProduct.cost_per_sqm || 0;
      }
      case 'leaflets':
        return (product as LeafletsProduct).cost_per_unit || 0;
      default:
        return 0;
    }
  };

  // Calculate total price for an item
  const calculateItemTotal = (product: Product, quantity: number, item: Partial<JobItem>): number => {
    if (!product) return 0;
    
    switch (product.category) {
      case 'packaging': {
        const packagingProduct = product as PackagingProduct;
        const isPrinted = item.is_printed || false;
        // Calculate unit cost if needed
        let unitCost = packagingProduct.unit_cost || 0;
        if (unitCost === 0 && packagingProduct.box_cost && packagingProduct.units_per_box) {
          unitCost = packagingProduct.box_cost / packagingProduct.units_per_box;
        }
        // Add 20% to cost if printed
        return quantity * unitCost * (isPrinted ? 1.2 : 1);
      }
      case 'wide_format': {
        const wideFormatProduct = product as WideFormatProduct;
        const width = item.width_m || 1;
        const height = item.height_m || 1;
        const area = width * height;
        
        // Calculate cost per sqm if needed
        let costPerSqm = wideFormatProduct.cost_per_sqm || 0;
        if (costPerSqm === 0 && wideFormatProduct.roll_cost && wideFormatProduct.width_m && wideFormatProduct.length_m) {
          const rollArea = wideFormatProduct.width_m * wideFormatProduct.length_m;
          costPerSqm = wideFormatProduct.roll_cost / rollArea;
        }
        
        return quantity * area * costPerSqm;
      }
      case 'leaflets': {
        const leafletsProduct = product as LeafletsProduct;
        return quantity * (leafletsProduct.cost_per_unit || 0);
      }
      default:
        return 0;
    }
  };

  // Calculate total cost for all items
  const calculateTotalCost = (items: JobItem[]): number => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  // Handle item property changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate total price if quantity or dimensions change
    if (['quantity', 'is_printed', 'width_m', 'height_m'].includes(field)) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        item.total_price = calculateItemTotal(product, item.quantity, item);
      }
    }
    
    newItems[index] = item;
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_cost: calculateTotalCost(newItems),
    }));
  };

  // Handle text field changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select field changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        due_date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        due_date: undefined,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!formData.customer_name) {
      setError('Customer name is required');
      setLoading(false);
      return;
    }

    if (formData.items.length === 0) {
      setError('At least one item is required');
      setLoading(false);
      return;
    }

    try {
      // Get the first item's product name to use as the job's product_name
      const product_name = formData.items[0]?.product_name || 'Multiple Products';
      
      // Calculate size based on the first item's dimensions if available
      const size = formData.items[0]?.width_m && formData.items[0]?.height_m 
        ? `${formData.items[0].width_m}m x ${formData.items[0].height_m}m` 
        : 'Various';
      
      // Calculate total quantity across all items
      const quantity = formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      if (isEditMode && id) {
        // Fetch current job to get work_completed value
        const currentJob = await jobApi.getJobById(parseInt(id));
        
        // Update existing job
        await jobApi.updateJob(parseInt(id), {
          ...formData,
          product_name,
          size,
          quantity,
          work_completed: currentJob.work_completed // Preserve existing work_completed value
        });
        enqueueSnackbar('Job updated successfully', { variant: 'success' });
      } else {
        // Create new job
        await jobApi.createJob({
          ...formData,
          product_name,
          size,
          quantity,
          work_completed: 0
        });
        enqueueSnackbar('Job created successfully', { variant: 'success' });
      }
      
      navigate('/dashboard/jobs');
    } catch (err: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} job:`, err);
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} job`);
      enqueueSnackbar(`Failed to ${isEditMode ? 'update' : 'create'} job`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Render form fields based on product category
  const renderProductFields = (item: JobItem, index: number) => {
    if (!item.product_id) return null;

    switch (item.product_category) {
      case 'packaging':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={item.is_printed || false}
                    onChange={(e) => handleItemChange(index, 'is_printed', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Printed"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Quantity"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                disabled={loading}
                InputProps={{
                  inputProps: { min: 1 },
                  endAdornment: <InputAdornment position="end">units</InputAdornment>,
                }}
              />
            </Grid>
          </>
        );
      
      case 'wide_format':
        return (
          <>
            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                type="number"
                label="Width"
                value={item.width_m || ''}
                onChange={(e) => handleItemChange(index, 'width_m', parseFloat(e.target.value) || 0)}
                disabled={loading}
                InputProps={{
                  inputProps: { min: 0.1, step: 0.1 },
                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                type="number"
                label="Height"
                value={item.height_m || ''}
                onChange={(e) => handleItemChange(index, 'height_m', parseFloat(e.target.value) || 0)}
                disabled={loading}
                InputProps={{
                  inputProps: { min: 0.1, step: 0.1 },
                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                type="number"
                label="Quantity"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                disabled={loading}
                InputProps={{
                  inputProps: { min: 1 },
                  endAdornment: <InputAdornment position="end">units</InputAdornment>,
                }}
              />
            </Grid>
          </>
        );
      
      case 'leaflets':
        return (
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Quantity"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
              disabled={loading}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: <InputAdornment position="end">units</InputAdornment>,
              }}
            />
          </Grid>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {isEditMode ? 'Edit Job' : 'Create New Job'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !products.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Customer Name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleTextChange}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Due Date"
                    value={formData.due_date ? new Date(formData.due_date) : null}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    label="Status"
                    disabled={loading}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="artwork_issue">Artwork Issue</MenuItem>
                    <MenuItem value="client_approval">Client Approval</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6">Job Items</Typography>
                </Divider>
              </Grid>

              {formData.items.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography color="textSecondary">No items added yet</Typography>
                  </Box>
                </Grid>
              ) : (
                formData.items.map((item, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6">Item {index + 1}</Typography>
                          <IconButton 
                            color="error" 
                            onClick={() => removeItem(index)}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                              <InputLabel>Product Category</InputLabel>
                              <Select
                                value={item.product_category || ''}
                                label="Product Category"
                                onChange={(e) => handleCategorySelect(index, e.target.value as Product['category'])}
                                disabled={loading || !!item.product_id}
                              >
                                <MenuItem value="packaging">Packaging</MenuItem>
                                <MenuItem value="wide_format">Wide Format</MenuItem>
                                <MenuItem value="leaflets">Leaflets & Brochures</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                              <InputLabel>Product</InputLabel>
                              <Select
                                value={item.product_id || ''}
                                label="Product"
                                onChange={(e) => handleProductSelect(index, e.target.value as number)}
                                disabled={loading}
                              >
                                {item.product_category === 'packaging' && packagingProducts.map(product => {
                                  // Calculate unit cost if needed
                                  let unitCost = product.unit_cost || 0;
                                  if (unitCost === 0 && product.box_cost && product.units_per_box) {
                                    unitCost = product.box_cost / product.units_per_box;
                                  }
                                  return (
                                    <MenuItem key={product.id} value={product.id}>
                                      {product.name} - €{unitCost.toFixed(2)}/unit
                                    </MenuItem>
                                  );
                                })}
                                {item.product_category === 'wide_format' && wideFormatProducts.map(product => {
                                  // Calculate cost per sqm if needed
                                  let costPerSqm = product.cost_per_sqm || 0;
                                  if (costPerSqm === 0 && product.roll_cost && product.width_m && product.length_m) {
                                    const area = product.width_m * product.length_m;
                                    costPerSqm = product.roll_cost / area;
                                  }
                                  return (
                                    <MenuItem key={product.id} value={product.id}>
                                      {product.name} - €{costPerSqm.toFixed(2)}/m²
                                    </MenuItem>
                                  );
                                })}
                                {item.product_category === 'leaflets' && leafletsProducts.map(product => (
                                  <MenuItem key={product.id} value={product.id}>
                                    {product.name} - €{product.cost_per_unit.toFixed(2)}/unit
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          {renderProductFields(item, index)}
                          
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Typography variant="subtitle1">
                                Item Total: €{parseFloat(item.total_price.toString()).toFixed(2)}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}

              <Grid item xs={12}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  disabled={loading}
                  variant="outlined"
                  fullWidth
                >
                  Add Item
                </Button>
              </Grid>

              {formData.items.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Typography variant="h6">
                      Total Cost: €{parseFloat(formData.total_cost.toString()).toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleTextChange}
                  disabled={loading}
                  placeholder="Any additional information about the job"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard/jobs')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || formData.items.length === 0}
                  >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Job' : 'Create Job')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default CreateJob; 