import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  IconButton,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useNavigate, useParams } from 'react-router-dom';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { invoiceApi, InvoiceFormData, InvoiceItem } from '../services/invoiceApi';
import { customerApi, Customer } from '../services/customerApi';
import { productApi, Product } from '../services/productApi';
import { useSnackbar } from 'notistack';

// VAT rate options
const VAT_RATES = [
  { value: '23', label: '23%' },
  { value: '13.5', label: '13.5%' },
  { value: '9', label: '9%' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Initial invoice item
const initialInvoiceItem: InvoiceItem = {
  description: '',
  quantity: 1,
  unit_price: 0,
  total_price: 0,
};

// Initial form data
const initialFormData: InvoiceFormData = {
  customer_id: 0,
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  subtotal: 0,
  vat_rate: '23',
  vat_amount: 0,
  total_amount: 0,
  notes: '',
  status: 'draft',
  items: [{ ...initialInvoiceItem }],
};

const InvoiceForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch customers, products, and invoice data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch customers
        const customersData = await customerApi.getAllCustomers();
        setCustomers(customersData);
        
        // Fetch products
        const productsData = await productApi.getAllProducts();
        setProducts(productsData);
        
        // If in edit mode, fetch invoice data
        if (isEditMode && id) {
          const invoiceData = await invoiceApi.getInvoiceById(parseInt(id));
          
          // Set form data from invoice
          setFormData({
            customer_id: invoiceData.customer_id,
            issue_date: invoiceData.issue_date,
            due_date: invoiceData.due_date,
            subtotal: invoiceData.subtotal,
            vat_rate: invoiceData.vat_rate,
            vat_amount: invoiceData.vat_amount,
            total_amount: invoiceData.total_amount,
            notes: invoiceData.notes || '',
            status: invoiceData.status,
            items: invoiceData.items.map(item => ({
              id: item.id,
              product_id: item.product_id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              width_m: item.width_m,
              height_m: item.height_m,
              total_price: item.total_price,
            })),
          });
          
          // Set selected customer
          const customer = customersData.find(c => c.id === invoiceData.customer_id) || null;
          setSelectedCustomer(customer);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
        enqueueSnackbar('Failed to load data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, enqueueSnackbar]);

  // Format currency
  const formatCurrency = (amount: number | string | null | undefined) => {
    // Convert to number and handle null/undefined
    const numAmount = amount !== null && amount !== undefined ? Number(amount) : 0;
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '€0.00';
    }
    
    return `€${numAmount.toFixed(2)}`;
  };

  // Add a new item to the invoice
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialInvoiceItem }],
    }));
  };

  // Remove an item from the invoice
  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        items: newItems,
      };
      return calculateTotals(updatedFormData);
    });
  };

  // Handle customer selection
  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_id: customer?.id || 0,
    }));
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number | null) => {
    if (!productId) return;
    
    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    const newItems = [...formData.items];
    
    // Initialize item with product data
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      description: selectedProduct.name,
      product_category: selectedProduct.category,
      unit_price: getProductUnitPrice(selectedProduct),
      total_price: calculateItemTotal(selectedProduct, newItems[index].quantity, newItems[index]),
    };
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        items: newItems,
      };
      return calculateTotals(updatedFormData);
    });
  };

  // Get unit price based on product type
  const getProductUnitPrice = (product: Product): number => {
    switch (product.category) {
      case 'packaging': {
        const packagingProduct = product as any;
        return packagingProduct.unit_cost || 0;
      }
      case 'wide_format': {
        const wideFormatProduct = product as any;
        return wideFormatProduct.cost_per_sqm || 0;
      }
      case 'leaflets': {
        const leafletsProduct = product as any;
        return leafletsProduct.cost_per_unit || 0;
      }
      case 'finished_product': {
        const finishedProduct = product as any;
        return finishedProduct.cost_per_sqm || 0;
      }
      default:
        return 0;
    }
  };

  // Calculate total price for an item
  const calculateItemTotal = (product: Product, quantity: number, item: Partial<InvoiceItem>): number => {
    if (!product) return 0;
    
    switch (product.category) {
      case 'packaging': {
        return quantity * (item.unit_price || 0);
      }
      case 'wide_format': {
        const width = item.width_m || 1;
        const height = item.height_m || 1;
        const area = width * height;
        return quantity * area * (item.unit_price || 0);
      }
      case 'finished_product': {
        const width = item.width_m || 1;
        const height = item.height_m || 1;
        const area = width * height;
        return quantity * area * (item.unit_price || 0);
      }
      case 'leaflets': {
        return quantity * (item.unit_price || 0);
      }
      default:
        return 0;
    }
  };

  // Handle item property changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate total price if quantity, dimensions, or unit price change
    if (['quantity', 'width_m', 'height_m', 'unit_price'].includes(field)) {
      if (item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          item.total_price = calculateItemTotal(product, item.quantity, item);
        }
      } else {
        // For custom items without a product
        if (field === 'unit_price' || field === 'quantity') {
          item.total_price = (item.quantity || 0) * (item.unit_price || 0);
        }
      }
    }
    
    newItems[index] = item;
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        items: newItems,
      };
      return calculateTotals(updatedFormData);
    });
  };

  // Calculate subtotal, VAT, and total
  const calculateTotals = (data: InvoiceFormData): InvoiceFormData => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const vatRate = parseFloat(data.vat_rate);
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;
    
    return {
      ...data,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
    };
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent) => {
    const { name, value } = e.target as { name?: string; value: unknown };
    if (!name) return;
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        [name]: value,
      };
      
      // Recalculate totals if VAT rate changes
      if (name === 'vat_rate') {
        return calculateTotals(updatedFormData);
      }
      
      return updatedFormData;
    });
  };

  // Handle date changes
  const handleDateChange = (field: 'issue_date' | 'due_date', date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!formData.customer_id) {
      setError('Customer is required');
      enqueueSnackbar('Customer is required', { variant: 'error' });
      return;
    }
    
    if (formData.items.length === 0) {
      setError('At least one item is required');
      enqueueSnackbar('At least one item is required', { variant: 'error' });
      return;
    }
    
    for (const item of formData.items) {
      if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
        setError('All items must have a description, quantity, and unit price');
        enqueueSnackbar('All items must have a description, quantity, and unit price', { variant: 'error' });
        return;
      }
    }
    
    try {
      setLoading(true);
      
      if (isEditMode && id) {
        // Update existing invoice
        await invoiceApi.updateInvoice(parseInt(id), formData);
        enqueueSnackbar('Invoice updated successfully', { variant: 'success' });
      } else {
        // Create new invoice
        await invoiceApi.createInvoice(formData);
        enqueueSnackbar('Invoice created successfully', { variant: 'success' });
      }
      
      navigate('/dashboard/invoices');
    } catch (err: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} invoice:`, err);
      // Log more detailed error information
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack,
        formData: JSON.stringify(formData)
      });
      
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} invoice`);
      enqueueSnackbar(`Failed to ${isEditMode ? 'update' : 'create'} invoice: ${err.response?.data?.message || err.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !customers.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Customer Selection */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => option.name + (option.company ? ` (${option.company})` : '')}
                  value={selectedCustomer}
                  onChange={(_, newValue) => handleCustomerChange(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Customer"
                      variant="outlined"
                      error={!formData.customer_id}
                      helperText={!formData.customer_id ? 'Customer is required' : ''}
                    />
                  )}
                />
              </Grid>

              {/* Invoice Status */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Issue Date */}
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Issue Date"
                    value={formData.issue_date ? new Date(formData.issue_date) : null}
                    onChange={(date) => handleDateChange('issue_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        required: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Due Date */}
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Due Date"
                    value={formData.due_date ? new Date(formData.due_date) : null}
                    onChange={(date) => handleDateChange('due_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        required: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* VAT Rate */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>VAT Rate</InputLabel>
                  <Select
                    name="vat_rate"
                    value={formData.vat_rate}
                    onChange={handleChange}
                    label="VAT Rate"
                  >
                    {VAT_RATES.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6">Invoice Items</Typography>
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
                            disabled={loading || formData.items.length <= 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={3}>
                          {/* Product Selection */}
                          <Grid item xs={12} md={6}>
                            <Autocomplete
                              options={products}
                              getOptionLabel={(option) => option.name}
                              groupBy={(option) => option.category.charAt(0).toUpperCase() + option.category.slice(1).replace('_', ' ')}
                              value={item.product_id ? products.find(p => p.id === item.product_id) || null : null}
                              onChange={(_, newValue) => handleProductSelect(index, newValue?.id || null)}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Product (Optional)"
                                  variant="outlined"
                                />
                              )}
                            />
                          </Grid>

                          {/* Description */}
                          <Grid item xs={12} md={6}>
                            <TextField
                              required
                              fullWidth
                              label="Description"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              disabled={loading}
                            />
                          </Grid>

                          {/* Quantity */}
                          <Grid item xs={12} md={item.product_category === 'wide_format' || item.product_category === 'finished_product' ? 4 : 6}>
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
                              }}
                            />
                          </Grid>

                          {/* Unit Price */}
                          <Grid item xs={12} md={item.product_category === 'wide_format' || item.product_category === 'finished_product' ? 4 : 6}>
                            <TextField
                              required
                              fullWidth
                              type="number"
                              label="Unit Price"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              disabled={loading}
                              InputProps={{
                                inputProps: { min: 0, step: 0.01 },
                                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                              }}
                            />
                          </Grid>

                          {/* Width and Height for Wide Format and Finished Products */}
                          {(item.product_category === 'wide_format' || item.product_category === 'finished_product') && (
                            <>
                              <Grid item xs={6} md={2}>
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
                              <Grid item xs={6} md={2}>
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
                            </>
                          )}

                          {/* Item Total */}
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Typography variant="subtitle1">
                                Item Total: {formatCurrency(item.total_price)}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}

              {/* Add Item Button */}
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

              {/* Invoice Totals */}
              {formData.items.length > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          disabled={loading}
                          placeholder="Any additional information about the invoice"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1">Subtotal:</Typography>
                            <Typography variant="body1">{formatCurrency(formData.subtotal)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1">VAT ({formData.vat_rate}%):</Typography>
                            <Typography variant="body1">{formatCurrency(formData.vat_amount)}</Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h6">Total:</Typography>
                            <Typography variant="h6">{formatCurrency(formData.total_amount)}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {/* Form Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard/invoices')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || formData.items.length === 0 || !formData.customer_id}
                  >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Invoice' : 'Create Invoice')}
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

export default InvoiceForm; 