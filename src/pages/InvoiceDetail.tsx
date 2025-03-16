import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { invoiceApi, Invoice, InvoiceItem } from '../services/invoiceApi';
import { useSnackbar } from 'notistack';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Status color mapping
const statusColors = {
  draft: 'default',
  sent: 'primary',
  paid: 'success',
  overdue: 'error',
  cancelled: 'warning',
} as const;

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!id) return;
    
    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const invoiceData = await invoiceApi.getInvoiceById(parseInt(id));
        setInvoice(invoiceData);
      } catch (err) {
        console.error('Failed to fetch invoice details:', err);
        setError('Failed to load invoice details. Please try again.');
        enqueueSnackbar('Failed to load invoice details', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [id, enqueueSnackbar]);

  const handleGenerateJob = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const job = await invoiceApi.generateJob(parseInt(id));
      enqueueSnackbar('Job generated successfully', { variant: 'success' });
      navigate(`/dashboard/jobs/${job.id}/details`);
    } catch (error) {
      console.error('Failed to generate job:', error);
      enqueueSnackbar('Failed to generate job', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Convert to number and handle null/undefined
    const numAmount = amount !== null && amount !== undefined ? Number(amount) : 0;
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '€0.00';
    }
    
    return `€${numAmount.toFixed(2)}`;
  };

  // Simple print function
  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    
    // Reload the page to restore React functionality
    window.location.reload();
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      setLoading(true);
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice-${invoice?.invoice_number || id}.pdf`);
      
      enqueueSnackbar('Invoice downloaded as PDF', { variant: 'success' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      enqueueSnackbar('Failed to download PDF', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: Invoice['status']) => (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={statusColors[status]}
      sx={{ textTransform: 'capitalize' }}
    />
  );

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
          onClick={() => navigate('/dashboard/invoices')}
        >
          Back to Invoices
        </Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Invoice not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/invoices')}
          sx={{ mt: 2 }}
        >
          Back to Invoices
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/invoices')}
        >
          Back to Invoices
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<AssignmentIcon />}
                onClick={handleGenerateJob}
              >
                Generate Job
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/dashboard/invoices/${id}/edit`)}
              >
                Edit Invoice
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Invoice
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={loading}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }} ref={printRef} id="printable-invoice">
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Invoice: {invoice.invoice_number}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Status: {getStatusChip(invoice.status)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6">
              {formatCurrency(invoice.total_amount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Issue Date: {formatDate(invoice.issue_date)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Due Date: {formatDate(invoice.due_date)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Customer Information
                </Typography>
                <Typography variant="body1">
                  {invoice.customer_name}
                </Typography>
                {invoice.customer_company && (
                  <Typography variant="body2">
                    {invoice.customer_company}
                  </Typography>
                )}
                {invoice.customer_address && (
                  <Typography variant="body2">
                    {invoice.customer_address}
                  </Typography>
                )}
                {(invoice.customer_city || invoice.customer_postal_code) && (
                  <Typography variant="body2">
                    {invoice.customer_city}{invoice.customer_postal_code ? `, ${invoice.customer_postal_code}` : ''}
                  </Typography>
                )}
                {invoice.customer_country && (
                  <Typography variant="body2">
                    {invoice.customer_country}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(invoice.subtotal)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    VAT Rate:
                  </Typography>
                  <Typography variant="body2">
                    {invoice.vat_rate}%
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    VAT Amount:
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(invoice.vat_amount)}
                  </Typography>
                  
                  <Typography variant="body1" fontWeight="bold" color="text.secondary">
                    Total:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(invoice.total_amount)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {invoice.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                {invoice.notes}
              </Typography>
            </Paper>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invoice Items
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Dimensions</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No items found for this invoice
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice.items.map((item: InvoiceItem, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell>
                        {item.width_m && item.height_m 
                          ? `${item.width_m}m × ${item.height_m}m` 
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={3} />
                  <TableCell align="right">
                    <Typography variant="subtitle2">Subtotal:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">
                      {formatCurrency(invoice.subtotal)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} />
                  <TableCell align="right">
                    <Typography variant="subtitle2">VAT ({invoice.vat_rate}%):</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">
                      {formatCurrency(invoice.vat_amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} />
                  <TableCell align="right">
                    <Typography variant="h6">Total:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">
                      {formatCurrency(invoice.total_amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default InvoiceDetail; 