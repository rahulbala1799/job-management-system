import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon } from '@mui/icons-material';
import { jobApi, Job, JobItem } from '../services/jobApi';
import { jobCostingApi } from '../services/jobCostingApi';
import { useSnackbar } from 'notistack';

// Status color mapping
const statusColors = {
  pending: 'warning',
  in_progress: 'info',
  artwork_issue: 'error',
  client_approval: 'secondary',
  completed: 'success',
  cancelled: 'default',
} as const;

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for item-level update dialog
  const [itemUpdateDialogOpen, setItemUpdateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);
  const [itemWorkCompleted, setItemWorkCompleted] = useState<number>(0);
  const [itemInkCostPerUnit, setItemInkCostPerUnit] = useState<string>('');
  const [itemInkConsumption, setItemInkConsumption] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get user role from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!id) return;
    
    const loadJobDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const jobData = await jobApi.getJobById(parseInt(id));
        setJob(jobData);
      } catch (error) {
        console.error('Failed to load job details:', error);
        setError('Failed to load job details. Please try again.');
        enqueueSnackbar('Failed to load job details', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    loadJobDetails();
  }, [id, enqueueSnackbar]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusChip = (status: Job['status']) => (
    <Chip
      label={status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      color={statusColors[status]}
      sx={{ textTransform: 'capitalize' }}
    />
  );

  // Add a function to handle opening the item update dialog
  const handleOpenItemDialog = (item: JobItem) => {
    setSelectedItem(item);
    setItemWorkCompleted(item.work_completed || 0);
    setItemInkCostPerUnit(item.ink_cost_per_unit?.toString() || '');
    setItemInkConsumption(item.ink_consumption?.toString() || '');
    setItemUpdateDialogOpen(true);
  };

  // Handle update item progress
  const handleUpdateItemProgress = async (item: JobItem, newValue: number) => {
    if (!job || !id) return;
    
    setIsUpdatingProgress(true);
    
    console.log(`Updating item progress: item ID ${item.id}, new value: ${newValue}, max: ${item.quantity}`);
    
    try {
      // Don't allow values greater than the item quantity
      const validValue = Math.min(newValue, item.quantity);
      
      // Update item
      const updatedItem = await jobApi.updateJobItemProgress(parseInt(id), item.id as number, { 
        work_completed: validValue
      });
      
      console.log('Item updated successfully:', updatedItem);
      
      // Save ink costs to job_costing table if provided
      const jobId = parseInt(id);
      
      // Handle ink costs based on product category
      if (item.product_category === 'packaging' && parseFloat(itemInkCostPerUnit)) {
        const costPerUnit = parseFloat(itemInkCostPerUnit);
        await jobCostingApi.addPackagingInkCost(
          jobId,
          item.id as number,
          costPerUnit,
          item.quantity
        );
      } else if (item.product_category === 'wide_format' && parseFloat(itemInkConsumption)) {
        // Assuming a standard ink cost per ml - this should be configurable
        const INK_COST_PER_ML = 0.05; // €0.05 per ml - this is an example value
        const consumptionMl = parseFloat(itemInkConsumption);
        
        await jobCostingApi.addWideFormatInkCost(
          jobId,
          item.id as number,
          INK_COST_PER_ML,
          consumptionMl
        );
      }
      
      // Update job in state
      if (job) {
        const updatedJob = {
          ...job,
          items: job.items.map(i => i.id === item.id ? updatedItem : i)
        };
        setJob(updatedJob);
        
        // Refresh job data to get the updated work_completed total
        const refreshedJob = await jobApi.getJobById(parseInt(id));
        setJob(refreshedJob);
      }
      
      // Show success message
      setSuccessMessage('Progress updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update item progress:', error);
      setErrorMessage('Failed to update progress');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Handle item update save
  const handleSaveItemUpdate = async () => {
    if (!selectedItem || !job || !id) return;
    
    setIsUpdatingProgress(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // Don't allow values greater than the item quantity
      const validValue = Math.min(itemWorkCompleted, selectedItem.quantity);
      
      // Update item progress
      const updatedItem = await jobApi.updateJobItemProgress(parseInt(id), selectedItem.id as number, { 
        work_completed: validValue
      });
      
      console.log('Item updated successfully:', updatedItem);
      
      // Save ink costs to job_costing table if provided
      const jobId = parseInt(id);
      
      // Handle ink costs based on product category
      if (selectedItem.product_category === 'packaging' && parseFloat(itemInkCostPerUnit)) {
        const costPerUnit = parseFloat(itemInkCostPerUnit);
        await jobCostingApi.addPackagingInkCost(
          jobId,
          selectedItem.id as number,
          costPerUnit,
          selectedItem.quantity
        );
      } else if (selectedItem.product_category === 'wide_format' && parseFloat(itemInkConsumption)) {
        // Assuming a standard ink cost per ml - this should be configurable
        const INK_COST_PER_ML = 0.05; // €0.05 per ml - this is an example value
        const consumptionMl = parseFloat(itemInkConsumption);
        
        await jobCostingApi.addWideFormatInkCost(
          jobId,
          selectedItem.id as number,
          INK_COST_PER_ML,
          consumptionMl
        );
      }
      
      // Update job in state with new data
      const jobData = await jobApi.getJobById(parseInt(id));
      setJob(jobData);
      
      setSuccessMessage('Item updated successfully');
      setItemUpdateDialogOpen(false);
    } catch (error) {
      console.error('Failed to update item:', error);
      setErrorMessage('Failed to update item. Please try again.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/jobs')}
        >
          Back to Jobs
        </Button>
      </Box>
    );
  }

  if (!job) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Job not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/jobs')}
          sx={{ mt: 2 }}
        >
          Back to Jobs
        </Button>
      </Box>
    );
  }

  // Check if job is of Printed Packaging category (at least one item)
  const hasPrintedPackaging = job?.items?.some(item => 
    item.product_category === 'packaging'
  ) || false;
  
  // Check if job is of Wide Format category (at least one item)
  const hasWideFormat = job?.items?.some(item => 
    item.product_category === 'wide_format'
  ) || false;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/jobs')}
        >
          Back to Jobs
        </Button>
        <Box>
          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => navigate(`/dashboard/jobs/${id}/edit`)}
            >
              Edit Job
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Job #{job.id}: {job.product_name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Customer: {job.customer_name}
            </Typography>
          </Box>
          <Box>
            {getStatusChip(job.status)}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Job Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Size:
                  </Typography>
                  <Typography variant="body2">
                    {job.size}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Total Quantity:
                  </Typography>
                  <Typography variant="body2">
                    {job.quantity}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Work Completed:
                  </Typography>
                  <Box>
                    <Typography variant="body2">
                      {job.work_completed} of {job.quantity} ({Math.round((job.work_completed / job.quantity) * 100)}%)
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(job.work_completed / job.quantity) * 100}
                      sx={{ mt: 1, height: 8, borderRadius: 2 }}
                    />
                  </Box>
                  
                  {hasPrintedPackaging && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Ink Cost Per Unit:
                      </Typography>
                      <Typography variant="body2">
                        {job.ink_cost_per_unit ? `€${job.ink_cost_per_unit.toFixed(2)}` : 'Not set'}
                      </Typography>
                    </>
                  )}
                  
                  {hasWideFormat && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Ink Consumption:
                      </Typography>
                      <Typography variant="body2">
                        {job.ink_consumption ? `${job.ink_consumption.toFixed(2)} ml` : 'Not set'}
                      </Typography>
                    </>
                  )}
                  
                  {isAdmin && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Total Cost:
                      </Typography>
                      <Typography variant="body2">
                        €{parseFloat(job.total_cost.toString()).toFixed(2)}
                      </Typography>
                    </>
                  )}
                  
                  <Typography variant="body2" color="text.secondary">
                    Due Date:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(job.due_date)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Timeline
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(job.created_at)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Last Updated:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(job.updated_at)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body2">
                    {getStatusChip(job.status)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {job.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                {job.notes}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Required Products
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Dimensions</TableCell>
                <TableCell>Progress</TableCell>
                {isAdmin && (
                  <>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total Price</TableCell>
                  </>
                )}
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {job.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 6} align="center">
                    No products found for this job
                  </TableCell>
                </TableRow>
              ) : (
                job.items.map((item: JobItem, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.product_category.replace('_', ' ')} 
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>
                      {item.width_m && item.height_m 
                        ? `${item.width_m}m × ${item.height_m}m` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ width: '20%' }}>
                      <Box>
                        <Typography variant="caption">
                          {item.work_completed || 0} of {item.quantity} ({Math.round(((item.work_completed || 0) / item.quantity) * 100)}%)
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={((item.work_completed || 0) / item.quantity) * 100}
                          sx={{ height: 8, borderRadius: 2 }}
                        />
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <>
                        <TableCell align="right">
                          €{parseFloat(item.unit_price.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          €{parseFloat(item.total_price.toString()).toFixed(2)}
                        </TableCell>
                      </>
                    )}
                    <TableCell align="center">
                      <Tooltip title="Update Progress">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenItemDialog(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {isAdmin && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 4} />
                  <TableCell align="right">
                    <Typography variant="subtitle2">Total:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">
                      €{parseFloat(job.total_cost.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Item Progress Update Dialog */}
      <Dialog 
        open={itemUpdateDialogOpen} 
        onClose={() => setItemUpdateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Update Item Progress</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedItem.product_name}
              </Typography>
              
              <TextField
                label="Work Completed"
                type="number"
                fullWidth
                margin="normal"
                value={itemWorkCompleted}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= selectedItem.quantity) {
                    setItemWorkCompleted(value);
                  }
                }}
                InputProps={{
                  inputProps: { min: 0, max: selectedItem.quantity }
                }}
                helperText={`Maximum: ${selectedItem.quantity}`}
              />
              
              {selectedItem.product_category === 'packaging' && (
                <TextField
                  label="Ink Cost Per Unit (€)"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={itemInkCostPerUnit}
                  onChange={(e) => setItemInkCostPerUnit(e.target.value)}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              )}
              
              {selectedItem.product_category === 'wide_format' && (
                <TextField
                  label="Ink Consumption (ml)"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={itemInkConsumption}
                  onChange={(e) => setItemInkConsumption(e.target.value)}
                  InputProps={{
                    inputProps: { min: 0, step: 0.1 }
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemUpdateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveItemUpdate} 
            variant="contained" 
            color="primary"
            disabled={!selectedItem || isUpdatingProgress}
          >
            {isUpdatingProgress ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobDetail; 