import React, { useState, useEffect } from 'react';
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
} from '@mui/material';

interface TimeRecord {
  id: number;
  date: string;
  clock_in: string;
  clock_out: string | null;
  total_hours?: number;
}

const TimeTracking = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data - will be replaced with API calls
  const [timeRecords] = useState<TimeRecord[]>([
    {
      id: 1,
      date: '2024-03-14',
      clock_in: '09:00:00',
      clock_out: '17:00:00',
      total_hours: 8,
    },
    {
      id: 2,
      date: '2024-03-13',
      clock_in: '08:45:00',
      clock_out: '16:30:00',
      total_hours: 7.75,
    },
  ]);

  useEffect(() => {
    // Check if user is currently clocked in
    // This will be replaced with an API call
    const checkClockStatus = async () => {
      try {
        // TODO: Implement API call to check clock status
        // For now, we'll use mock data
        setIsClockedIn(false);
        setCurrentTime(null);
      } catch (error) {
        console.error('Failed to check clock status:', error);
      }
    };

    checkClockStatus();
  }, []);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to clock in
      console.log('Clocking in...');
      setIsClockedIn(true);
      setCurrentTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to clock in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to clock out
      console.log('Clocking out...');
      setIsClockedIn(false);
      setCurrentTime(null);
    } catch (error) {
      console.error('Failed to clock out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Time Tracking
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          {isClockedIn ? 'Currently Working' : 'Not Clocked In'}
        </Typography>
        
        {currentTime && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Clocked in at: {currentTime}
          </Typography>
        )}

        <Button
          variant="contained"
          color={isClockedIn ? 'error' : 'primary'}
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          size="large"
          sx={{ mt: 2 }}
        >
          {loading ? 'Processing...' : isClockedIn ? 'Clock Out' : 'Clock In'}
        </Button>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Recent Time Records
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Clock In</TableCell>
              <TableCell>Clock Out</TableCell>
              <TableCell align="right">Total Hours</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                <TableCell>{record.clock_in}</TableCell>
                <TableCell>{record.clock_out || '-'}</TableCell>
                <TableCell align="right">
                  {record.total_hours?.toFixed(2) || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TimeTracking; 