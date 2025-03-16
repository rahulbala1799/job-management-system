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
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { userApi, User, UserFormData } from '../services/userApi';
import { useSnackbar } from 'notistack';

const initialFormData: UserFormData = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'employee',
};

const UserManagement = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Define fetchUsers with useCallback
  const fetchUsers = useCallback(async () => {
    try {
      setFetchLoading(true);
      setError('');
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setFetchLoading(false);
    }
  }, [enqueueSnackbar]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userApi.createUser(formData);
      enqueueSnackbar('User created successfully', { variant: 'success' });
      handleClose();
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      console.error('Failed to create user:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to create user', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.deleteUser(userId);
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete user', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">User Management</Typography>
        <Button
          variant="contained"
          onClick={() => setOpenDialog(true)}
        >
          Add New User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {fetchLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || user.username}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                required
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                required
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                required
                type="password"
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                select
                required
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 