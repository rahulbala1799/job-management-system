import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { jobApi, Job } from '../services/jobApi';
import { productApi, Product, PackagingProduct, WideFormatProduct, LeafletsProduct } from '../services/productApi';
import { useNavigate } from 'react-router-dom';
import { jobCostingApi, JobCost } from '../services/jobCostingApi';

// Define job data interface
interface JobData {
  id: number;
  customer_name: string;
  product_name: string;
  created_at: string;
  revenue: number;
  cost: number;
  margin: number;
}

// Define stats interface
interface StatsData {
  totalRevenue: string;
  totalCost: string;
  totalInkCost: string;
  totalMaterialCost: string;
  totalOtherCosts: string;
  
  packagingRevenue: string;
  packagingCost: string;
  packagingInkCost: string;
  packagingMaterialCost: string;
  packagingOtherCosts: string;
  
  wideFormatRevenue: string;
  wideFormatCost: string;
  wideFormatInkCost: string;
  wideFormatMaterialCost: string;
  wideFormatOtherCosts: string;
  
  leafletsRevenue: string;
  leafletsCost: string;
  leafletsInkCost: string;
  leafletsMaterialCost: string;
  leafletsOtherCosts: string;
  
  overallMargin: string;
  packagingMargin: string;
  wideFormatMargin: string;
  leafletsMargin: string;
  
  packagingJobs: JobData[];
  wideFormatJobs: JobData[];
  leafletsJobs: JobData[];
}

// Define interfaces for debug information
interface ItemDebugInfo {
  productId: number;
  productName: string;
  category: 'packaging' | 'wide_format' | 'leaflets' | 'finished_product';
  revenue: number;
  cost: number;
  details: Record<string, any>;
}

interface JobDebugInfo {
  jobId: number;
  jobName: string;
  items: ItemDebugInfo[];
}

// Add a new component for cost breakdown
const CostBreakdown = ({ 
  open, 
  onClose, 
  title,
  revenue,
  cost,
  additionalData
}: { 
  open: boolean; 
  onClose: () => void; 
  title: string;
  revenue: number;
  cost: number;
  additionalData?: any;
}) => {
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} sx={{ marginBottom: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Revenue</TableCell>
                <TableCell align="right">€{revenue.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Cost</TableCell>
                <TableCell align="right">€{cost.toFixed(2)}</TableCell>
              </TableRow>
              {additionalData && additionalData.costBreakdown && (
                <>
                  <TableRow>
                    <TableCell style={{ paddingLeft: '2rem' }}>Material Cost</TableCell>
                    <TableCell align="right">€{additionalData.costBreakdown.materialCost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingLeft: '2rem' }}>Ink Cost</TableCell>
                    <TableCell align="right">€{additionalData.costBreakdown.inkCost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingLeft: '2rem' }}>Other Costs</TableCell>
                    <TableCell align="right">€{additionalData.costBreakdown.otherCosts.toFixed(2)}</TableCell>
                  </TableRow>
                </>
              )}
              <TableRow>
                <TableCell>Profit</TableCell>
                <TableCell align="right">€{profit.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Margin</TableCell>
                <TableCell align="right">{margin.toFixed(2)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {additionalData && additionalData.items && additionalData.items.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>Top Items by Margin</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Margin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {additionalData.items.map((item: any, index: number) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell align="right">€{(item.total_price || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">€{(item.cost || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">{item.margin ? item.margin.toFixed(2) : '0.00'}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Stat card component
const StatCard = ({ 
  title, 
  value, 
  color, 
  tooltip,
  onClick
}: { 
  title: string; 
  value: string | number; 
  color: string; 
  tooltip?: string;
  onClick?: () => void;
}) => (
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        minHeight: '160px', 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s',
        '&:hover': {
          transform: onClick ? 'translateY(-5px)' : 'none',
          boxShadow: onClick ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
        }
      }}
      onClick={onClick}
    >
      <CardContent>
        <Typography variant="h6" color="textSecondary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          {title}
          {tooltip && (
            <Tooltip title={tooltip}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Typography>
        <Typography variant="h4" component="div" sx={{ color: color, fontWeight: 'bold' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

const Overview = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownTitle, setBreakdownTitle] = useState('');
  const [breakdownRevenue, setBreakdownRevenue] = useState(0);
  const [breakdownCost, setBreakdownCost] = useState(0);
  const [breakdownData, setBreakdownData] = useState<any>(null);
  
  const [stats, setStats] = useState<StatsData>({
    totalRevenue: '0',
    totalCost: '0',
    totalInkCost: '0',
    totalMaterialCost: '0',
    totalOtherCosts: '0',
    packagingRevenue: '0',
    packagingCost: '0',
    packagingInkCost: '0',
    packagingMaterialCost: '0',
    packagingOtherCosts: '0',
    wideFormatRevenue: '0',
    wideFormatCost: '0',
    wideFormatInkCost: '0',
    wideFormatMaterialCost: '0',
    wideFormatOtherCosts: '0',
    leafletsRevenue: '0',
    leafletsCost: '0',
    leafletsInkCost: '0',
    leafletsMaterialCost: '0',
    leafletsOtherCosts: '0',
    overallMargin: '0',
    packagingMargin: '0',
    wideFormatMargin: '0',
    leafletsMargin: '0',
    packagingJobs: [],
    wideFormatJobs: [],
    leafletsJobs: []
  });
  
  const [products, setProducts] = useState<Product[]>([]);

  const showBreakdown = (title: string, revenue: number, cost: number, data?: any) => {
    // Prepare cost breakdown data
    let costBreakdown = {
      inkCost: 0,
      materialCost: 0,
      otherCosts: 0
    };
    
    if (title === 'Overall Margin') {
      costBreakdown = {
        inkCost: parseFloat(stats.totalInkCost),
        materialCost: parseFloat(stats.totalMaterialCost),
        otherCosts: parseFloat(stats.totalOtherCosts)
      };
    } else if (title === 'Packaging Margin') {
      costBreakdown = {
        inkCost: parseFloat(stats.packagingInkCost),
        materialCost: parseFloat(stats.packagingMaterialCost),
        otherCosts: parseFloat(stats.packagingOtherCosts)
      };
    } else if (title === 'Wide Format Margin') {
      costBreakdown = {
        inkCost: parseFloat(stats.wideFormatInkCost),
        materialCost: parseFloat(stats.wideFormatMaterialCost),
        otherCosts: parseFloat(stats.wideFormatOtherCosts)
      };
    } else if (title === 'Leaflets Margin') {
      costBreakdown = {
        inkCost: parseFloat(stats.leafletsInkCost),
        materialCost: parseFloat(stats.leafletsMaterialCost),
        otherCosts: parseFloat(stats.leafletsOtherCosts)
      };
    }
    
    setBreakdownTitle(title);
    setBreakdownRevenue(revenue);
    setBreakdownCost(cost);
    setBreakdownData({
      ...(data || {}),
      costBreakdown
    });
    setBreakdownOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch jobs data
        const jobs = await jobApi.getAllJobs();
        
        // Process job data for overview stats
        const { 
          totalRevenue, totalCost, 
          totalInkCost, totalMaterialCost, totalOtherCosts,
          packagingRevenue, packagingCost, 
          packagingInkCost, packagingMaterialCost, packagingOtherCosts,
          wideFormatRevenue, wideFormatCost, 
          wideFormatInkCost, wideFormatMaterialCost, wideFormatOtherCosts,
          leafletsRevenue, leafletsCost,
          leafletsInkCost, leafletsMaterialCost, leafletsOtherCosts,
          packagingJobs, wideFormatJobs, leafletsJobs,
        } = await processJobsData(jobs);
        
        console.log('Final revenue calculations:');
        console.log(`Total Revenue: ${totalRevenue}`);
        console.log(`Packaging Revenue: ${packagingRevenue}`);
        console.log(`Wide Format Revenue: ${wideFormatRevenue}`);
        console.log(`Leaflets Revenue: ${leafletsRevenue}`);
        
        console.log('Final cost calculations:');
        console.log(`Total Cost: ${totalCost}`);
        console.log(`Total Ink Cost: ${totalInkCost}`);
        console.log(`Total Material Cost: ${totalMaterialCost}`);
        console.log(`Total Other Costs: ${totalOtherCosts}`);
        console.log(`Packaging Cost: ${packagingCost}`);
        console.log(`Wide Format Cost: ${wideFormatCost}`);
        console.log(`Leaflets Cost: ${leafletsCost}`);
        
        console.log('Final margin calculations:');
        
        // Calculate margin percentages
        const overallMargin = totalRevenue > 0
          ? ((totalRevenue - totalCost) / totalRevenue) * 100
          : 0;
          
        const packagingMargin = packagingRevenue > 0
          ? ((packagingRevenue - packagingCost) / packagingRevenue) * 100
          : 0;
          
        const wideFormatMargin = wideFormatRevenue > 0
          ? ((wideFormatRevenue - wideFormatCost) / wideFormatRevenue) * 100
          : 0;
          
        const leafletsMargin = leafletsRevenue > 0
          ? ((leafletsRevenue - leafletsCost) / leafletsRevenue) * 100
          : 0;
        
        console.log(`Overall Margin: ${overallMargin}%`);
        console.log(`Packaging Margin: ${packagingMargin}%`);
        console.log(`Wide Format Margin: ${wideFormatMargin}%`);
        console.log(`Leaflets Margin: ${leafletsMargin}%`);
        
        // Set state with calculated values
        setStats({
          totalRevenue: totalRevenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          totalInkCost: totalInkCost.toFixed(2),
          totalMaterialCost: totalMaterialCost.toFixed(2),
          totalOtherCosts: totalOtherCosts.toFixed(2),
          
          packagingRevenue: packagingRevenue.toFixed(2),
          packagingCost: packagingCost.toFixed(2),
          packagingInkCost: packagingInkCost.toFixed(2),
          packagingMaterialCost: packagingMaterialCost.toFixed(2),
          packagingOtherCosts: packagingOtherCosts.toFixed(2),
          
          wideFormatRevenue: wideFormatRevenue.toFixed(2),
          wideFormatCost: wideFormatCost.toFixed(2),
          wideFormatInkCost: wideFormatInkCost.toFixed(2),
          wideFormatMaterialCost: wideFormatMaterialCost.toFixed(2),
          wideFormatOtherCosts: wideFormatOtherCosts.toFixed(2),
          
          leafletsRevenue: leafletsRevenue.toFixed(2),
          leafletsCost: leafletsCost.toFixed(2),
          leafletsInkCost: leafletsInkCost.toFixed(2),
          leafletsMaterialCost: leafletsMaterialCost.toFixed(2),
          leafletsOtherCosts: leafletsOtherCosts.toFixed(2),
          
          overallMargin: overallMargin.toFixed(2),
          packagingMargin: packagingMargin.toFixed(2),
          wideFormatMargin: wideFormatMargin.toFixed(2),
          leafletsMargin: leafletsMargin.toFixed(2),
          
          packagingJobs,
          wideFormatJobs,
          leafletsJobs
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load overview data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processJobsData = async (jobs: any[]) => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalInkCost = 0;
    let totalMaterialCost = 0;
    let totalOtherCosts = 0;
    
    let packagingRevenue = 0;
    let packagingCost = 0;
    let packagingInkCost = 0;
    let packagingMaterialCost = 0;
    let packagingOtherCosts = 0;
    
    let wideFormatRevenue = 0;
    let wideFormatCost = 0;
    let wideFormatInkCost = 0;
    let wideFormatMaterialCost = 0;
    let wideFormatOtherCosts = 0;
    
    let leafletsRevenue = 0;
    let leafletsCost = 0;
    let leafletsInkCost = 0;
    let leafletsMaterialCost = 0;
    let leafletsOtherCosts = 0;
    
    const packagingItems: any[] = [];
    const wideFormatItems: any[] = [];
    const leafletsItems: any[] = [];
    
    const packagingJobs: any[] = [];
    const wideFormatJobs: any[] = [];
    const leafletsJobs: any[] = [];
    
    // Only consider completed jobs
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    console.log("COMPLETED JOBS COUNT:", completedJobs.length);
    
    if (completedJobs.length === 0) {
      console.warn("No completed jobs found!");
    }

    // For each job, process costs
    for (const job of completedJobs) {
      console.log(`Processing job: ${job.id} - ${job.product_name}`);
      
      // Get job costs from job_costing table
      let jobCosts: JobCost[] = [];
      try {
        jobCosts = await jobCostingApi.getJobCosts(job.id);
        console.log(`Job ${job.id} costs:`, jobCosts);
      } catch (error) {
        console.error(`Error fetching costs for job ${job.id}:`, error);
      }
      
      // Initialize job-level cost tracking
      let jobPackagingCost = 0;
      let jobPackagingInkCost = 0;
      let jobPackagingMaterialCost = 0;
      let jobPackagingOtherCosts = 0;
      
      let jobWideFormatCost = 0;
      let jobWideFormatInkCost = 0;
      let jobWideFormatMaterialCost = 0;
      let jobWideFormatOtherCosts = 0;
      
      let jobLeafletsCost = 0;
      let jobLeafletsInkCost = 0;
      let jobLeafletsMaterialCost = 0;
      let jobLeafletsOtherCosts = 0;
      
      let jobPackagingRevenue = 0;
      let jobWideFormatRevenue = 0; 
      let jobLeafletsRevenue = 0;
      
      // Process each item in the job
      for (const item of job.items) {
        console.log(`  Processing item: ${item.id} - ${item.product_name}`);
        
        // Calculate revenue for this item
        const itemRevenue = parseFloat(item.total_price);
        
        // Get item costs from job_costing table
        const itemCosts = jobCosts.filter(cost => cost.job_item_id === item.id);
        
        // Calculate material cost
        let materialCost = 0;
        let inkCost = 0;
        let otherCosts = 0;
        
        // If we have item costs from job_costing table, use those
        if (itemCosts && itemCosts.length > 0) {
          // Sum up different cost types
          inkCost = itemCosts.filter(cost => cost.cost_type === 'ink')
            .reduce((sum, cost) => sum + parseFloat(cost.cost_amount.toString()), 0);
          
          materialCost = itemCosts.filter(cost => cost.cost_type === 'material')
            .reduce((sum, cost) => sum + parseFloat(cost.cost_amount.toString()), 0);
            
          otherCosts = itemCosts.filter(cost => cost.cost_type !== 'ink' && cost.cost_type !== 'material')
            .reduce((sum, cost) => sum + parseFloat(cost.cost_amount.toString()), 0);
          
          const totalItemCost = inkCost + materialCost + otherCosts;
          console.log(`    USING JOB_COSTING: item ${item.id}, ink costs: ${inkCost}, material costs: ${materialCost}, other costs: ${otherCosts}, total: ${totalItemCost}`);
        } else {
          // Legacy calculation - fallback to old method
          console.log(`    NO JOB_COSTING RECORDS for item ${item.id}, using legacy calculation`);
          if (item.product_category === 'packaging') {
            if (item.ink_cost_per_unit) {
              inkCost = parseFloat(item.ink_cost_per_unit.toString()) * item.quantity;
              console.log(`    Legacy packaging calculation: ink_cost_per_unit ${item.ink_cost_per_unit} * quantity ${item.quantity} = ${inkCost}`);
            } else {
              console.log(`    No ink_cost_per_unit for packaging item ${item.id}`);
            }
          } else if (item.product_category === 'wide_format') {
            // For wide format, calculate based on ink consumption
            if (item.ink_consumption) {
              const INK_COST_PER_ML = 0.05; // €0.05 per ml - this is an example value
              inkCost = parseFloat(item.ink_consumption.toString()) * INK_COST_PER_ML;
            }
            console.log(`    Revenue: ${itemRevenue}, Ink cost: ${inkCost}, Material cost: ${materialCost}, Other costs: ${otherCosts}`);
          } else if (item.product_category === 'leaflets') {
            // For leaflets, we might not track specific ink cost
            // This could be enhanced with more detailed costing
            console.log(`    Revenue: ${itemRevenue}, Ink cost: ${inkCost}, Material cost: ${materialCost}, Other costs: ${otherCosts}`);
          }
        }

        const totalItemCost = inkCost + materialCost + otherCosts;
        
        // Aggregate costs and revenue by product category
        if (item.product_category === 'packaging') {
          jobPackagingCost += totalItemCost;
          jobPackagingInkCost += inkCost;
          jobPackagingMaterialCost += materialCost;
          jobPackagingOtherCosts += otherCosts;
          jobPackagingRevenue += itemRevenue;
          
          // Add to packaging metrics
          packagingCost += totalItemCost;
          packagingInkCost += inkCost;
          packagingMaterialCost += materialCost;
          packagingOtherCosts += otherCosts;
          packagingRevenue += itemRevenue;
          
          // Add to item list
          packagingItems.push({
            ...item,
            cost: totalItemCost,
            inkCost,
            materialCost,
            otherCosts,
            margin: itemRevenue > 0 ? ((itemRevenue - totalItemCost) / itemRevenue) * 100 : 0
          });
        } else if (item.product_category === 'wide_format') {
          jobWideFormatCost += totalItemCost;
          jobWideFormatInkCost += inkCost;
          jobWideFormatMaterialCost += materialCost;
          jobWideFormatOtherCosts += otherCosts;
          jobWideFormatRevenue += itemRevenue;
          
          // Add to wide format metrics
          wideFormatCost += totalItemCost;
          wideFormatInkCost += inkCost;
          wideFormatMaterialCost += materialCost;
          wideFormatOtherCosts += otherCosts;
          wideFormatRevenue += itemRevenue;
          
          // Add to item list
          wideFormatItems.push({
            ...item,
            cost: totalItemCost,
            inkCost,
            materialCost,
            otherCosts,
            margin: itemRevenue > 0 ? ((itemRevenue - totalItemCost) / itemRevenue) * 100 : 0
          });
        } else if (item.product_category === 'leaflets') {
          jobLeafletsCost += totalItemCost;
          jobLeafletsInkCost += inkCost;
          jobLeafletsMaterialCost += materialCost;
          jobLeafletsOtherCosts += otherCosts;
          jobLeafletsRevenue += itemRevenue;
          
          // Add to leaflets metrics
          leafletsCost += totalItemCost;
          leafletsInkCost += inkCost;
          leafletsMaterialCost += materialCost;
          leafletsOtherCosts += otherCosts;
          leafletsRevenue += itemRevenue;
          
          // Add to item list
          leafletsItems.push({
            ...item,
            cost: totalItemCost,
            inkCost,
            materialCost,
            otherCosts,
            margin: itemRevenue > 0 ? ((itemRevenue - totalItemCost) / itemRevenue) * 100 : 0
          });
        }
        
        // Add to total metrics
        totalCost += totalItemCost;
        totalInkCost += inkCost;
        totalMaterialCost += materialCost;
        totalOtherCosts += otherCosts;
        totalRevenue += itemRevenue;
      }
      
      // Log job-level metrics
      console.log(`  Packaging: Revenue: ${jobPackagingRevenue}, Cost: ${jobPackagingCost}, Margin: ${jobPackagingRevenue > 0 ? (jobPackagingRevenue - jobPackagingCost) / jobPackagingRevenue * 100 : 0}%`);
      console.log(`  Wide Format: Revenue: ${jobWideFormatRevenue}, Cost: ${jobWideFormatCost}, Margin: ${jobWideFormatRevenue > 0 ? (jobWideFormatRevenue - jobWideFormatCost) / jobWideFormatRevenue * 100 : 0}%`);
      console.log(`  Leaflets: Revenue: ${jobLeafletsRevenue}, Cost: ${jobLeafletsCost}, Margin: ${jobLeafletsRevenue > 0 ? (jobLeafletsRevenue - jobLeafletsCost) / jobLeafletsRevenue * 100 : 0}%`);
      
      // Add to job lists
      const jobData = {
        id: job.id,
        customer_name: job.customer_name,
        product_name: job.product_name,
        created_at: job.created_at,
        revenue: 0,
        cost: 0,
        margin: 0
      };
      
      if (jobPackagingRevenue > 0) {
        const margin = jobPackagingRevenue > 0 ? ((jobPackagingRevenue - jobPackagingCost) / jobPackagingRevenue) * 100 : 0;
        console.log(`    Packaging Job Margin: Revenue ${jobPackagingRevenue}, Cost ${jobPackagingCost}, Margin ${margin}%`);
        packagingJobs.push({
          ...jobData, 
          revenue: jobPackagingRevenue, 
          cost: jobPackagingCost, 
          inkCost: jobPackagingInkCost,
          materialCost: jobPackagingMaterialCost,
          otherCosts: jobPackagingOtherCosts,
          margin
        });
      }
      
      if (jobWideFormatRevenue > 0) {
        const margin = jobWideFormatRevenue > 0 ? ((jobWideFormatRevenue - jobWideFormatCost) / jobWideFormatRevenue) * 100 : 0;
        console.log(`    Wide Format Job Margin: Revenue ${jobWideFormatRevenue}, Cost ${jobWideFormatCost}, Margin ${margin}%`);
        wideFormatJobs.push({
          ...jobData, 
          revenue: jobWideFormatRevenue, 
          cost: jobWideFormatCost, 
          inkCost: jobWideFormatInkCost,
          materialCost: jobWideFormatMaterialCost,
          otherCosts: jobWideFormatOtherCosts,
          margin
        });
      }
      
      if (jobLeafletsRevenue > 0) {
        const margin = jobLeafletsRevenue > 0 ? ((jobLeafletsRevenue - jobLeafletsCost) / jobLeafletsRevenue) * 100 : 0;
        console.log(`    Leaflets Job Margin: Revenue ${jobLeafletsRevenue}, Cost ${jobLeafletsCost}, Margin ${margin}%`);
        leafletsJobs.push({
          ...jobData, 
          revenue: jobLeafletsRevenue, 
          cost: jobLeafletsCost, 
          inkCost: jobLeafletsInkCost,
          materialCost: jobLeafletsMaterialCost,
          otherCosts: jobLeafletsOtherCosts,
          margin
        });
      }
    }
    
    // Sort job lists by margin (highest to lowest)
    packagingJobs.sort((a, b) => b.margin - a.margin);
    wideFormatJobs.sort((a, b) => b.margin - a.margin);
    leafletsJobs.sort((a, b) => b.margin - a.margin);
    
    console.log("FINAL TOTALS:");
    console.log(`  Total Revenue: ${totalRevenue}, Total Cost: ${totalCost}, Margin: ${totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0}%`);
    console.log(`  Total Ink Cost: ${totalInkCost}, Total Material Cost: ${totalMaterialCost}, Total Other Costs: ${totalOtherCosts}`);
    console.log(`  Packaging: Revenue: ${packagingRevenue}, Cost: ${packagingCost}, Ink: ${packagingInkCost}, Material: ${packagingMaterialCost}, Other: ${packagingOtherCosts}`);
    console.log(`  Wide Format: Revenue: ${wideFormatRevenue}, Cost: ${wideFormatCost}, Ink: ${wideFormatInkCost}, Material: ${wideFormatMaterialCost}, Other: ${wideFormatOtherCosts}`);
    console.log(`  Leaflets: Revenue: ${leafletsRevenue}, Cost: ${leafletsCost}, Ink: ${leafletsInkCost}, Material: ${leafletsMaterialCost}, Other: ${leafletsOtherCosts}`);
    
    return {
      totalRevenue,
      totalCost,
      totalInkCost,
      totalMaterialCost,
      totalOtherCosts,
      packagingRevenue,
      packagingCost,
      packagingInkCost,
      packagingMaterialCost,
      packagingOtherCosts,
      wideFormatRevenue,
      wideFormatCost,
      wideFormatInkCost,
      wideFormatMaterialCost,
      wideFormatOtherCosts,
      leafletsRevenue,
      leafletsCost,
      leafletsInkCost,
      leafletsMaterialCost,
      leafletsOtherCosts,
      packagingItems,
      wideFormatItems,
      leafletsItems,
      packagingJobs,
      wideFormatJobs,
      leafletsJobs
    };
  };

  if (loading) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" gutterBottom>Overview</Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" gutterBottom>Overview</Typography>
        <Paper sx={{ padding: 2, backgroundColor: '#fee' }}>
          <Typography color="error">{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{ marginTop: 2 }}>Retry</Button>
        </Paper>
      </Box>
    );
  }

  const totalProfit = parseFloat(stats.totalRevenue) - parseFloat(stats.totalCost);
  const packagingProfit = parseFloat(stats.packagingRevenue) - parseFloat(stats.packagingCost);
  const wideFormatProfit = parseFloat(stats.wideFormatRevenue) - parseFloat(stats.wideFormatCost);
  const leafletsProfit = parseFloat(stats.leafletsRevenue) - parseFloat(stats.leafletsCost);

  return (
    <Box>
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" gutterBottom>Overview</Typography>
        
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Revenue & Cost Summary</Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Revenue</TableCell>
                    <TableCell align="right">€{stats.totalRevenue}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Total Cost</TableCell>
                    <TableCell align="right">€{stats.totalCost}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Profit</TableCell>
                    <TableCell align="right">€{totalProfit.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Margin</TableCell>
                    <TableCell align="right">{stats.overallMargin}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product Class</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Margin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover onClick={() => showBreakdown('Packaging Margin', parseFloat(stats.packagingRevenue), parseFloat(stats.packagingCost), { items: stats.packagingJobs })}>
                    <TableCell>Packaging</TableCell>
                    <TableCell align="right">€{stats.packagingRevenue}</TableCell>
                    <TableCell align="right">€{stats.packagingCost}</TableCell>
                    <TableCell align="right">{stats.packagingMargin}%</TableCell>
                  </TableRow>
                  <TableRow hover onClick={() => showBreakdown('Wide Format Margin', parseFloat(stats.wideFormatRevenue), parseFloat(stats.wideFormatCost), { items: stats.wideFormatJobs })}>
                    <TableCell>Wide Format</TableCell>
                    <TableCell align="right">€{stats.wideFormatRevenue}</TableCell>
                    <TableCell align="right">€{stats.wideFormatCost}</TableCell>
                    <TableCell align="right">{stats.wideFormatMargin}%</TableCell>
                  </TableRow>
                  <TableRow hover onClick={() => showBreakdown('Leaflets Margin', parseFloat(stats.leafletsRevenue), parseFloat(stats.leafletsCost), { items: stats.leafletsJobs })}>
                    <TableCell>Leaflets</TableCell>
                    <TableCell align="right">€{stats.leafletsRevenue}</TableCell>
                    <TableCell align="right">€{stats.leafletsCost}</TableCell>
                    <TableCell align="right">{stats.leafletsMargin}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
        
        <Divider sx={{ marginY: 4 }} />
        
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Profit Margin Analysis</Typography>
          </Grid>
          
          <StatCard 
            title="Overall Margin"
            value={`${stats.overallMargin}%`}
            color={parseFloat(stats.overallMargin) >= 25 ? 'green' : parseFloat(stats.overallMargin) >= 15 ? 'orange' : 'red'}
            tooltip="Overall profit margin across all product classes"
            onClick={() => showBreakdown('Overall Margin', parseFloat(stats.totalRevenue), parseFloat(stats.totalCost), {
              items: [...stats.packagingJobs, ...stats.wideFormatJobs, ...stats.leafletsJobs].sort((a, b) => b.margin - a.margin)
            })}
          />
          
          <StatCard 
            title="Packaging Margin"
            value={`${stats.packagingMargin}%`}
            color={parseFloat(stats.packagingMargin) >= 25 ? 'green' : parseFloat(stats.packagingMargin) >= 15 ? 'orange' : 'red'}
            tooltip="Profit margin for packaging products"
            onClick={() => showBreakdown('Packaging Margin', parseFloat(stats.packagingRevenue), parseFloat(stats.packagingCost), {
              items: stats.packagingJobs
            })}
          />
          
          <StatCard 
            title="Wide Format Margin"
            value={`${stats.wideFormatMargin}%`}
            color={parseFloat(stats.wideFormatMargin) >= 25 ? 'green' : parseFloat(stats.wideFormatMargin) >= 15 ? 'orange' : 'red'}
            tooltip="Profit margin for wide format products"
            onClick={() => showBreakdown('Wide Format Margin', parseFloat(stats.wideFormatRevenue), parseFloat(stats.wideFormatCost), {
              items: stats.wideFormatJobs
            })}
          />
          
          <StatCard 
            title="Leaflets Margin"
            value={`${stats.leafletsMargin}%`}
            color={parseFloat(stats.leafletsMargin) >= 25 ? 'green' : parseFloat(stats.leafletsMargin) >= 15 ? 'orange' : 'red'}
            tooltip="Profit margin for leaflets"
            onClick={() => showBreakdown('Leaflets Margin', parseFloat(stats.leafletsRevenue), parseFloat(stats.leafletsCost), {
              items: stats.leafletsJobs
            })}
          />
        </Grid>
        
        <Divider sx={{ marginY: 4 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Profit by Product Class</Typography>
          </Grid>
          
          <StatCard 
            title="Total Profit"
            value={`€${totalProfit.toFixed(2)}`}
            color="#1976d2"
            tooltip="Total profit across all product classes"
          />
          
          <StatCard 
            title="Packaging Profit"
            value={`€${packagingProfit.toFixed(2)}`}
            color="#1976d2"
            tooltip="Profit from packaging products"
          />
          
          <StatCard 
            title="Wide Format Profit"
            value={`€${wideFormatProfit.toFixed(2)}`}
            color="#1976d2"
            tooltip="Profit from wide format products"
          />
          
          <StatCard 
            title="Leaflets Profit"
            value={`€${leafletsProfit.toFixed(2)}`}
            color="#1976d2"
            tooltip="Profit from leaflets"
          />
        </Grid>
      </Box>
      
      <CostBreakdown 
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        title={breakdownTitle}
        revenue={breakdownRevenue}
        cost={breakdownCost}
        additionalData={breakdownData}
      />
    </Box>
  );
};

export default Overview; 