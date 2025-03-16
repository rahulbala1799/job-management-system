import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { jobApi, Job } from '../services/jobApi';
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

const JobList = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  // Define fetchJobs with useCallback
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await jobApi.getAllJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to load jobs. Please try again.');
      enqueueSnackbar('Failed to load jobs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleStatusChange = async (jobId: number, newStatus: Job['status']) => {
    try {
      await jobApi.updateJobStatus(jobId, newStatus);
      // Update local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );
      enqueueSnackbar('Job status updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Failed to update status:', error);
      enqueueSnackbar('Failed to update job status', { variant: 'error' });
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await jobApi.deleteJob(jobId);
      // Remove from local state
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      enqueueSnackbar('Job deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Failed to delete job:', error);
      enqueueSnackbar('Failed to delete job', { variant: 'error' });
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter !== 'all' && job.status !== filter) return false;
    if (search && !job.product_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Jobs</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/dashboard/jobs/create')}
        >
          Create New Job
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Search Jobs"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select
            label="Filter Status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="artwork_issue">Artwork Issue</MenuItem>
            <MenuItem value="client_approval">Client Approval</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <Button 
            variant="outlined" 
            onClick={fetchJobs}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Size</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow 
                    key={job.id}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                    onClick={() => navigate(`/dashboard/jobs/${job.id}/details`)}
                  >
                    <TableCell>{job.id}</TableCell>
                    <TableCell>{job.customer_name}</TableCell>
                    <TableCell>{job.product_name}</TableCell>
                    <TableCell>{job.size}</TableCell>
                    <TableCell align="right">{job.quantity}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TextField
                        select
                        size="small"
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as Job['status'])}
                      >
                        <MenuItem value="pending">
                          <Chip
                            label="Pending"
                            size="small"
                            color={statusColors.pending}
                          />
                        </MenuItem>
                        <MenuItem value="in_progress">
                          <Chip
                            label="In Progress"
                            size="small"
                            color={statusColors.in_progress}
                          />
                        </MenuItem>
                        <MenuItem value="artwork_issue">
                          <Chip
                            label="Artwork Issue"
                            size="small"
                            color={statusColors.artwork_issue}
                          />
                        </MenuItem>
                        <MenuItem value="client_approval">
                          <Chip
                            label="Client Approval"
                            size="small"
                            color={statusColors.client_approval}
                          />
                        </MenuItem>
                        <MenuItem value="completed">
                          <Chip
                            label="Completed"
                            size="small"
                            color={statusColors.completed}
                          />
                        </MenuItem>
                        <MenuItem value="cancelled">
                          <Chip
                            label="Cancelled"
                            size="small"
                            color={statusColors.cancelled}
                          />
                        </MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      €{parseFloat(job.total_cost.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {job.due_date ? new Date(job.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/jobs/${job.id}/details`);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Job">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/jobs/${job.id}`);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Job">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(job.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default JobList; 