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
  Add as AddIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoiceApi, Invoice } from '../services/invoiceApi';
import { useSnackbar } from 'notistack';

// Status color mapping
const statusColors = {
  draft: 'default',
  sent: 'primary',
  paid: 'success',
  overdue: 'error',
  cancelled: 'warning',
} as const;

const InvoiceList = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  // Define fetchInvoices with useCallback
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await invoiceApi.getAllInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError('Failed to load invoices. Please try again.');
      enqueueSnackbar('Failed to load invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoiceApi.deleteInvoice(id);
      // Remove from local state
      setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
      enqueueSnackbar('Invoice deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      enqueueSnackbar('Failed to delete invoice', { variant: 'error' });
    }
  };

  const handleGenerateJob = async (id: number) => {
    try {
      setLoading(true);
      const job = await invoiceApi.generateJob(id);
      enqueueSnackbar('Job generated successfully', { variant: 'success' });
      navigate(`/dashboard/jobs/${job.id}/details`);
    } catch (error) {
      console.error('Failed to generate job:', error);
      enqueueSnackbar('Failed to generate job', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices based on search term and status filter
  const filteredInvoices = invoices.filter(invoice => {
    if (filter !== 'all' && invoice.status !== filter) return false;
    
    const searchLower = search.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (invoice.customer_name && invoice.customer_name.toLowerCase().includes(searchLower)) ||
      (invoice.customer_company && invoice.customer_company.toLowerCase().includes(searchLower))
    );
  });

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

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Invoices</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/dashboard/invoices/create')}
          disabled={!isAdmin}
        >
          Create Invoice
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Search Invoices"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            placeholder="Search by invoice number, customer name, or company"
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
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <Button 
            variant="outlined" 
            onClick={fetchInvoices}
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

      {loading && !invoices.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="right">VAT</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                    onClick={() => navigate(`/dashboard/invoices/${invoice.id}/details`)}
                  >
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.customer_name}
                      {invoice.customer_company && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {invoice.customer_company}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        color={statusColors[invoice.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(invoice.subtotal)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(invoice.vat_amount)}
                      <Typography variant="caption" display="block" color="text.secondary">
                        ({invoice.vat_rate}%)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/invoices/${invoice.id}/details`);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit Invoice">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/invoices/${invoice.id}/edit`);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Generate Job">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateJob(invoice.id);
                                }}
                              >
                                <AssignmentIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Invoice">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(invoice.id);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
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

export default InvoiceList; 