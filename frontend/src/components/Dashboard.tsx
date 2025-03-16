import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  ExitToApp as LogoutIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

// Import pages (we'll create these next)
import Overview from '../pages/Overview';
import JobList from '../pages/JobList';
import CreateJob from '../pages/CreateJob';
import UserManagement from '../pages/UserManagement';
import TimeTracking from '../pages/TimeTracking';
import ProductManagement from '../pages/ProductManagement';
import JobDetail from '../pages/JobDetail';
import CustomerManagement from '../pages/CustomerManagement';
import InvoiceList from '../pages/InvoiceList';
import InvoiceForm from '../pages/InvoiceForm';
import InvoiceDetail from '../pages/InvoiceDetail';

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  adminOnly: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  const menuItems: MenuItem[] = [
    { text: 'Overview', icon: <DashboardIcon />, path: '/dashboard', adminOnly: false },
    { text: 'Job List', icon: <AssignmentIcon />, path: '/dashboard/jobs', adminOnly: false },
    { text: 'Create Job', icon: <AddIcon />, path: '/dashboard/jobs/create', adminOnly: true },
    { text: 'Products', icon: <InventoryIcon />, path: '/dashboard/products', adminOnly: true },
    { text: 'Customers', icon: <PeopleIcon />, path: '/dashboard/customers', adminOnly: true },
    { text: 'Invoices', icon: <ReceiptIcon />, path: '/dashboard/invoices', adminOnly: true },
    { text: 'Users', icon: <PersonIcon />, path: '/dashboard/users', adminOnly: true },
    { text: 'Time Tracking', icon: <TimeIcon />, path: '/dashboard/time', adminOnly: false },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Job Management
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          (!item.adminOnly || isAdmin) && (
            <ListItemButton
              key={item.text}
              onClick={() => handleNavigation(item.path)}
              selected={window.location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          )
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {user?.name || 'Dashboard'}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/create" element={isAdmin ? <CreateJob /> : <Overview />} />
          <Route path="/jobs/:id/details" element={<JobDetail />} />
          <Route path="/jobs/:id" element={isAdmin ? <CreateJob /> : <Overview />} />
          <Route path="/users" element={isAdmin ? <UserManagement /> : <Overview />} />
          <Route path="/products" element={isAdmin ? <ProductManagement /> : <Overview />} />
          <Route path="/customers" element={isAdmin ? <CustomerManagement /> : <Overview />} />
          <Route path="/invoices" element={isAdmin ? <InvoiceList /> : <Overview />} />
          <Route path="/invoices/create" element={isAdmin ? <InvoiceForm /> : <Overview />} />
          <Route path="/invoices/:id/details" element={isAdmin ? <InvoiceDetail /> : <Overview />} />
          <Route path="/invoices/:id/edit" element={isAdmin ? <InvoiceForm /> : <Overview />} />
          <Route path="/time" element={<TimeTracking />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default Dashboard; 