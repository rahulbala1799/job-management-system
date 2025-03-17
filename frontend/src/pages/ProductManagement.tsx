import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import { 
  productApi, 
  Product, 
  PackagingProduct, 
  WideFormatProduct, 
  LeafletsProduct, 
  FinishedProduct,
  FinishedProductComponent 
} from '../services/productApi';
import { useSnackbar } from 'notistack';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { utils, writeFile, read } from 'xlsx';

interface BaseFormData {
  name: string;
  category: 'packaging' | 'wide_format' | 'leaflets' | 'finished_product';
}

interface PackagingFormData extends BaseFormData {
  category: 'packaging';
  product_code: string;
  unit_type: 'boxed' | 'units';
  units_per_box?: number;
  box_cost?: number;
  unit_cost: number;
}

interface WideFormatFormData extends BaseFormData {
  category: 'wide_format';
  material: string;
  width_m: number;
  length_m: number;
  roll_cost: number;
}

interface LeafletsFormData extends BaseFormData {
  category: 'leaflets';
  material: string;
  thickness: string;
  cost_per_unit: number;
}

interface FinishedProductFormData extends BaseFormData {
  category: 'finished_product';
  material: string;
  components: FinishedProductComponent[];
}

type ProductFormData = PackagingFormData | WideFormatFormData | LeafletsFormData | FinishedProductFormData;

const initialPackagingFormData: PackagingFormData = {
  name: '',
  category: 'packaging',
  product_code: '',
  unit_type: 'units',
  unit_cost: 0,
};

const initialWideFormatFormData: WideFormatFormData = {
  name: '',
  category: 'wide_format',
  material: '',
  width_m: 0,
  length_m: 0,
  roll_cost: 0,
};

const initialLeafletsFormData: LeafletsFormData = {
  name: '',
  category: 'leaflets',
  material: '',
  thickness: '',
  cost_per_unit: 0,
};

const initialFinishedProductFormData: FinishedProductFormData = {
  name: '',
  category: 'finished_product',
  material: 'Mixed',
  components: [],
};

const categoryLabels = {
  packaging: 'Packaging',
  wide_format: 'Wide Format',
  leaflets: 'Leaflets & Brochures',
  finished_product: 'Finished Products',
};

const ProductManagement: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialPackagingFormData);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentTab, setCurrentTab] = useState<'packaging' | 'wide_format' | 'leaflets' | 'finished_product'>('packaging');
  const [calculatedCosts, setCalculatedCosts] = useState<{
    unitCost?: number;
    costPerSqm?: number;
  }>({});
  const { enqueueSnackbar } = useSnackbar();
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Component selector for finished products
  const [selectedComponent, setSelectedComponent] = useState<number>(0);
  const [componentQuantity, setComponentQuantity] = useState<number>(1);
  const [addComponentDialogOpen, setAddComponentDialogOpen] = useState(false);

  // Define loadProducts with useCallback
  const loadProducts = useCallback(async () => {
    try {
      console.log(`Loading products for tab: ${currentTab}`);
      setLoading(true);
      const data = await productApi.getProductsByCategory(currentTab);
      console.log(`Successfully loaded ${data?.length} products`);
      
      // Ensure we always have an array even if the API returns null/undefined
      setProducts(data || []);
      setLoading(false);
      
      // If there are no products but loading completed successfully
      if (data?.length === 0) {
        console.log('No products found for this category');
        enqueueSnackbar(`No products found in the ${currentTab} category. Create some!`, { 
          variant: 'info',
          preventDuplicate: true
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]); // Set empty array on error
      enqueueSnackbar('Failed to load products', { variant: 'error' });
      setLoading(false);
    }
  }, [currentTab, enqueueSnackbar]);

  // Load all products for component selection
  const loadAllProducts = useCallback(async () => {
    try {
      const data = await productApi.getAllProducts();
      setAllProducts(data);
    } catch (error) {
      console.error('Error loading all products:', error);
    }
  }, []);

  // Load products when tab changes
  useEffect(() => {
    loadProducts();
    loadAllProducts(); // Load all products for component selection
  }, [loadProducts, loadAllProducts]);

  // Effect to calculate derived costs
  useEffect(() => {
    if (formData.category === 'packaging' && formData.unit_type === 'boxed' && formData.box_cost && formData.units_per_box) {
      setCalculatedCosts({
        unitCost: formData.box_cost / formData.units_per_box
      });
    } else if (formData.category === 'wide_format' && formData.roll_cost && formData.width_m && formData.length_m) {
      setCalculatedCosts({
        costPerSqm: formData.roll_cost / (formData.width_m * formData.length_m)
      });
    } else if (formData.category === 'finished_product') {
      // Calculate total cost per sqm for finished product
      let totalCostPerSqm = 0;
      
      for (const component of (formData as FinishedProductFormData).components) {
        const componentProduct = allProducts.find(p => p.id === component.component_product_id);
        if (componentProduct) {
          let componentCost = 0;

          if (componentProduct.category === 'wide_format') {
            componentCost = (componentProduct as WideFormatProduct).cost_per_sqm;
          } else if (componentProduct.category === 'finished_product') {
            componentCost = (componentProduct as FinishedProduct).cost_per_sqm;
          }

          totalCostPerSqm += componentCost * component.quantity;
        }
      }
      
      setCalculatedCosts({
        costPerSqm: totalCostPerSqm
      });
    } else {
      setCalculatedCosts({});
    }
  }, [formData, allProducts]);

  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData(prev => {
      const newData = { ...prev };
      
      // Convert string values to numbers for numeric fields
      if (['units_per_box', 'box_cost', 'unit_cost', 'width_m', 'length_m', 'roll_cost', 'cost_per_unit'].includes(name)) {
        (newData as any)[name] = value === '' ? '' : Number(value);
      } else {
        (newData as any)[name] = value;
      }
      
      return newData as ProductFormData;
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData(prev => {
      // Reset form when category changes
      if (name === 'category') {
        switch (value as 'packaging' | 'wide_format' | 'leaflets' | 'finished_product') {
          case 'packaging':
            return initialPackagingFormData;
          case 'wide_format':
            return initialWideFormatFormData;
          case 'leaflets':
            return initialLeafletsFormData;
          case 'finished_product':
            return initialFinishedProductFormData;
          default:
            return prev;
        }
      }
      
      // Handle unit type changes for packaging products
      if (name === 'unit_type' && prev.category === 'packaging') {
        return {
          ...prev,
          unit_type: value as 'boxed' | 'units'
        } as PackagingFormData;
      }

      return prev;
    });
  };

  // Handle adding a component to a finished product
  const handleAddComponent = () => {
    if (!selectedComponent) return;

    const componentProduct = allProducts.find(p => p.id === selectedComponent);
    if (!componentProduct) return;

    setFormData(prev => {
      if (prev.category !== 'finished_product') return prev;

      const existingComponentIndex = (prev as FinishedProductFormData).components.findIndex(
        c => c.component_product_id === selectedComponent
      );

      const newComponents = [...(prev as FinishedProductFormData).components];

      // If component already exists, update its quantity
      if (existingComponentIndex !== -1) {
        newComponents[existingComponentIndex].quantity += componentQuantity;
      } else {
        // Otherwise add a new component
        newComponents.push({
          component_product_id: selectedComponent,
          component_name: componentProduct.name,
          quantity: componentQuantity
        });
      }

      return {
        ...prev,
        components: newComponents
      } as FinishedProductFormData;
    });

    setSelectedComponent(0);
    setComponentQuantity(1);
    setAddComponentDialogOpen(false);
  };

  // Handle removing a component from a finished product
  const handleRemoveComponent = (index: number) => {
    setFormData(prev => {
      if (prev.category !== 'finished_product') return prev;

      const newComponents = [...(prev as FinishedProductFormData).components];
      newComponents.splice(index, 1);

      return {
        ...prev,
        components: newComponents
      } as FinishedProductFormData;
    });
  };

  const renderFormFields = () => {
    switch (formData.category) {
      case 'packaging':
        return (
          <>
            <TextField
              required
              label="Product Code"
              name="product_code"
              value={(formData as PackagingFormData).product_code}
              onChange={handleTextFieldChange}
              disabled={loading}
            />
            <FormControl fullWidth required>
              <InputLabel>Unit Type</InputLabel>
              <Select
                name="unit_type"
                value={(formData as PackagingFormData).unit_type}
                onChange={handleSelectChange}
                label="Unit Type"
              >
                <MenuItem value="units">Units</MenuItem>
                <MenuItem value="boxed">Boxed</MenuItem>
              </Select>
            </FormControl>
            {(formData as PackagingFormData).unit_type === 'boxed' && (
              <>
                <TextField
                  required
                  type="number"
                  label="Units per Box"
                  name="units_per_box"
                  value={(formData as PackagingFormData).units_per_box || ''}
                  onChange={handleTextFieldChange}
                  disabled={loading}
                  inputProps={{ min: 1 }}
                />
                <TextField
                  required
                  type="number"
                  label="Box Cost"
                  name="box_cost"
                  value={(formData as PackagingFormData).box_cost || ''}
                  onChange={handleTextFieldChange}
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  }}
                  inputProps={{ step: 0.001, min: 0.001 }}
                />
                {calculatedCosts.unitCost && (
                  <Typography variant="body2" color="textSecondary">
                    Unit Cost: €{calculatedCosts.unitCost.toFixed(4)}
                  </Typography>
                )}
              </>
            )}
            {(formData as PackagingFormData).unit_type === 'units' && (
              <TextField
                required
                type="number"
                label="Unit Cost"
                name="unit_cost"
                value={(formData as PackagingFormData).unit_cost || ''}
                onChange={handleTextFieldChange}
                disabled={loading}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                inputProps={{ step: 0.001, min: 0.001 }}
              />
            )}
          </>
        );
      case 'wide_format':
        return (
          <>
            <TextField
              required
              label="Material"
              name="material"
              value={(formData as WideFormatFormData).material}
              onChange={handleTextFieldChange}
              disabled={loading}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                required
                type="number"
                label="Width (m)"
                name="width_m"
                value={(formData as WideFormatFormData).width_m || ''}
                onChange={handleTextFieldChange}
                disabled={loading}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                }}
                inputProps={{ step: 0.001, min: 0.001 }}
                sx={{ flex: 1 }}
              />
              <TextField
                required
                type="number"
                label="Length (m)"
                name="length_m"
                value={(formData as WideFormatFormData).length_m || ''}
                onChange={handleTextFieldChange}
                disabled={loading}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                }}
                inputProps={{ step: 0.001, min: 0.001 }}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              required
              type="number"
              label="Roll Cost"
              name="roll_cost"
              value={(formData as WideFormatFormData).roll_cost || ''}
              onChange={handleTextFieldChange}
              disabled={loading}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
              inputProps={{ step: 0.001, min: 0.001 }}
            />
            {calculatedCosts.costPerSqm && (
              <Typography variant="body2" color="textSecondary">
                Cost per sqm: €{calculatedCosts.costPerSqm.toFixed(4)}
              </Typography>
            )}
          </>
        );
      case 'leaflets':
        return (
          <>
            <TextField
              required
              label="Material"
              name="material"
              value={(formData as LeafletsFormData).material}
              onChange={handleTextFieldChange}
              disabled={loading}
            />
            <TextField
              required
              label="Thickness"
              name="thickness"
              value={(formData as LeafletsFormData).thickness}
              onChange={handleTextFieldChange}
              disabled={loading}
            />
            <TextField
              required
              type="number"
              label="Cost per Unit"
              name="cost_per_unit"
              value={(formData as LeafletsFormData).cost_per_unit || ''}
              onChange={handleTextFieldChange}
              disabled={loading}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
              inputProps={{ step: 0.001, min: 0.001 }}
            />
          </>
        );
      case 'finished_product':
        return (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Components
              </Typography>
              {(formData as FinishedProductFormData).components.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No components added yet. Add components to create a finished product.
                </Typography>
              ) : (
                <List>
                  {(formData as FinishedProductFormData).components.map((component, index) => {
                    const componentProduct = allProducts.find(p => p.id === component.component_product_id);
                    return (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={component.component_name || componentProduct?.name || `Component ${index + 1}`}
                            secondary={`Quantity: ${component.quantity}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleRemoveComponent(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < (formData as FinishedProductFormData).components.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddComponentDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Add Component
              </Button>
            </Box>
            
            {calculatedCosts.costPerSqm !== undefined && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Total Cost per sqm:</strong> €{calculatedCosts.costPerSqm.toFixed(4)}
              </Typography>
            )}
          </>
        );
      default:
        return null;
    }
  };

  // Make sure products is always an array before filtering
  const filteredProducts = Array.isArray(products) 
    ? products.filter(product => product.category === currentTab)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (formData.category === 'finished_product') {
        // Special handling for finished products
        const finishedProductData = formData as FinishedProductFormData;
        await productApi.createFinishedProduct({
          name: finishedProductData.name,
          category: 'finished_product',
          material: finishedProductData.material,
          components: finishedProductData.components,
          cost_per_sqm: calculatedCosts.costPerSqm || 0
        });
      } else {
        // Regular product creation
        await productApi.createProduct(formData);
      }
      
      await loadProducts();
      setOpenDialog(false);
      enqueueSnackbar('Product created successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error creating product:', error);
      enqueueSnackbar('Failed to create product', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  const handleDelete = async (productId: number) => {
    try {
      setLoading(true);
      await productApi.deleteProduct(productId);
      await loadProducts();
      enqueueSnackbar('Product deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting product:', error);
      enqueueSnackbar('Failed to delete product', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderProductDetails = (product: Product) => {
    switch (product.category) {
      case 'packaging':
        const packagingProduct = product as PackagingProduct;
        return (
          <>
            <TableCell>{packagingProduct.product_code}</TableCell>
            <TableCell>
              {packagingProduct.unit_type === 'boxed'
                ? `${packagingProduct.units_per_box} units per box @ €${packagingProduct.box_cost ? Number(packagingProduct.box_cost).toFixed(2) : '0.00'}`
                : 'Individual units'}
            </TableCell>
            <TableCell align="right">€{packagingProduct.unit_cost ? Number(packagingProduct.unit_cost).toFixed(2) : '0.00'}</TableCell>
          </>
        );
      case 'wide_format':
        const wideFormatProduct = product as WideFormatProduct;
        return (
          <>
            <TableCell>{wideFormatProduct.material}</TableCell>
            <TableCell>{wideFormatProduct.width_m}m × {wideFormatProduct.length_m}m</TableCell>
            <TableCell align="right">
              €{wideFormatProduct.roll_cost ? Number(wideFormatProduct.roll_cost).toFixed(2) : '0.00'} (€{wideFormatProduct.cost_per_sqm ? Number(wideFormatProduct.cost_per_sqm).toFixed(2) : '0.00'}/sqm)
            </TableCell>
          </>
        );
      case 'leaflets':
        const leafletsProduct = product as LeafletsProduct;
        return (
          <>
            <TableCell>{leafletsProduct.material}</TableCell>
            <TableCell>{leafletsProduct.thickness}</TableCell>
            <TableCell align="right">€{leafletsProduct.cost_per_unit ? Number(leafletsProduct.cost_per_unit).toFixed(2) : '0.00'}</TableCell>
          </>
        );
      case 'finished_product':
        const finishedProduct = product as FinishedProduct;
        return (
          <>
            <TableCell>{finishedProduct.material}</TableCell>
            <TableCell>Composite Product</TableCell>
            <TableCell align="right">€{finishedProduct.cost_per_sqm ? Number(finishedProduct.cost_per_sqm).toFixed(2) : '0.00'}/sqm</TableCell>
          </>
        );
      default:
        return (
          <>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
          </>
        );
    }
  };

  const downloadTemplate = () => {
    try {
      let headers: string[] = [];
      let templateData: any[] = [];
      
      switch (currentTab) {
        case 'packaging':
          headers = ['name', 'category', 'product_code', 'unit_type', 'units_per_box', 'box_cost', 'unit_cost'];
          templateData = [
            {
              name: 'Sample Box',
              category: 'packaging',
              product_code: 'BOX001',
              unit_type: 'boxed',
              units_per_box: 100,
              box_cost: 50,
              unit_cost: ''
            },
            {
              name: 'Sample Unit',
              category: 'packaging',
              product_code: 'UNIT001',
              unit_type: 'units',
              units_per_box: '',
              box_cost: '',
              unit_cost: 0.5
            }
          ];
          break;
        case 'wide_format':
          headers = ['name', 'category', 'material', 'width_m', 'length_m', 'roll_cost'];
          templateData = [
            {
              name: 'Sample Roll',
              category: 'wide_format',
              material: 'Vinyl',
              width_m: 1.5,
              length_m: 50,
              roll_cost: 120
            }
          ];
          break;
        case 'leaflets':
          headers = ['name', 'category', 'material', 'thickness', 'cost_per_unit'];
          templateData = [
            {
              name: 'Sample Leaflet',
              category: 'leaflets',
              material: 'Glossy Paper',
              thickness: '150gsm',
              cost_per_unit: 0.05
            }
          ];
          break;
        case 'finished_product':
          enqueueSnackbar('Finished products must be created through the interface', { variant: 'info' });
          return;
      }
      
      const worksheet = utils.json_to_sheet(templateData, { header: headers });
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, currentTab);
      
      writeFile(workbook, `${currentTab}_template.xlsx`);
      
      enqueueSnackbar('Template downloaded successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error downloading template:', error);
      enqueueSnackbar('Failed to download template', { variant: 'error' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }
    
    try {
      setUploadLoading(true);
      
      const file = fileInput.files[0];
      const data = await file.arrayBuffer();
      const workbook = read(data);
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const products = utils.sheet_to_json(worksheet);
      
      // Validate products
      if (products.length === 0) {
        throw new Error('No products found in file');
      }
      
      // Handle bulk creation based on category
      const category = currentTab;
      
      for (const product of products as any[]) {
        // Extract needed properties directly (avoids spread operator)
        const productData = {
          name: product.name || '',
          category,
          // Add other properties based on category
          ...(category === 'packaging' ? {
            product_code: product.product_code || '',
            unit_type: product.unit_type || 'units',
            units_per_box: product.units_per_box ? Number(product.units_per_box) : undefined,
            box_cost: product.box_cost ? Number(product.box_cost) : undefined,
            unit_cost: product.unit_cost ? Number(product.unit_cost) : 0
          } : {}),
          ...(category === 'wide_format' ? {
            material: product.material || '',
            width_m: product.width_m ? Number(product.width_m) : 0,
            length_m: product.length_m ? Number(product.length_m) : 0,
            roll_cost: product.roll_cost ? Number(product.roll_cost) : 0
          } : {}),
          ...(category === 'leaflets' ? {
            material: product.material || '',
            thickness: product.thickness || '',
            cost_per_unit: product.cost_per_unit ? Number(product.cost_per_unit) : 0
          } : {})
        };
        
        await productApi.createProduct(productData as any);
      }
      
      await loadProducts();
      
      enqueueSnackbar(`${products.length} products imported successfully`, { variant: 'success' });
    } catch (error) {
      console.error('Error uploading products:', error);
      enqueueSnackbar('Failed to import products', { variant: 'error' });
    } finally {
      setUploadLoading(false);
      if (fileInput) {
        fileInput.value = ''; // Reset file input
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Product Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Download template for bulk import">
            <Button
              variant="outlined"
              onClick={downloadTemplate}
              startIcon={<FileDownloadIcon />}
            >
              Template
            </Button>
          </Tooltip>
          <Tooltip title="Upload products from Excel file">
            <Button
              variant="outlined"
              component="label"
              startIcon={<FileUploadIcon />}
              disabled={uploadLoading}
            >
              {uploadLoading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(true)}
          >
            Add New Product
          </Button>
        </Box>
      </Box>

      <Paper sx={{ 
        mb: 3, 
        width: '100%',
        maxWidth: '100%'
      }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ width: '100%' }}
        >
          <Tab value="packaging" label="Packaging" />
          <Tab value="wide_format" label="Wide Format" />
          <Tab value="leaflets" label="Leaflets & Brochures" />
          <Tab value="finished_product" label="Finished Products" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper} sx={{ 
        width: '100%',
        maxWidth: '100%',
        mb: 3,
        overflowX: 'auto'
      }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {currentTab === 'packaging' && (
                  <>
                    <TableCell>Product Code</TableCell>
                    <TableCell>Package Details</TableCell>
                    <TableCell align="right">Unit Cost</TableCell>
                  </>
                )}
                {currentTab === 'wide_format' && (
                  <>
                    <TableCell>Material</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell align="right">Cost</TableCell>
                  </>
                )}
                {currentTab === 'leaflets' && (
                  <>
                    <TableCell>Material</TableCell>
                    <TableCell>Thickness</TableCell>
                    <TableCell align="right">Cost per Unit</TableCell>
                  </>
                )}
                {currentTab === 'finished_product' && (
                  <>
                    <TableCell>Material</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Cost per sqm</TableCell>
                  </>
                )}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  {renderProductDetails(product)}
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add Component Dialog */}
      <Dialog open={addComponentDialogOpen} onClose={() => setAddComponentDialogOpen(false)}>
        <DialogTitle>Add Component</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Component</InputLabel>
              <Select
                value={selectedComponent || ''}
                onChange={(e) => setSelectedComponent(Number(e.target.value))}
                label="Component"
              >
                <MenuItem value={0} disabled>Select a component</MenuItem>
                {allProducts
                  .filter(p => p.category === 'wide_format' || p.category === 'finished_product')
                  .filter(p => !(formData.category === 'finished_product' && 
                                (formData as FinishedProductFormData).components.some(
                                  c => c.component_product_id === p.id
                                )))
                  .map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.category === 'wide_format' ? 'Wide Format' : 'Finished Product'})
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Quantity"
              value={componentQuantity}
              onChange={(e) => setComponentQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddComponentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddComponent} 
            variant="contained" 
            disabled={!selectedComponent}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Product Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '1200px'
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleTextFieldChange}
                disabled={loading}
              />
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleSelectChange}
                  label="Category"
                  disabled={loading}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {renderFormFields()}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || (formData.category === 'finished_product' && 
                (formData as FinishedProductFormData).components.length === 0)}
            >
              {loading ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProductManagement; 