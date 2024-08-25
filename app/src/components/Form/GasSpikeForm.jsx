import React, { useState, useEffect } from 'react';
import {
  Box,
  Slider,
  TextField,
  Button,
  Typography,
  FormHelperText,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import './GasSpikeForm.css';

const GasSpikeForm = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [gasToBuy, setGasToBuy] = useState(20);
  const [extraTips, setExtraTips] = useState(0);
  const [premium, setPremium] = useState(0);
  const [gasPriceInGwei, setGasPriceInGwei] = useState(25);

  const gasPerTransaction = 21000;

  const ratePerGasUnit = gasPriceInGwei / 1e9;

  const calculateTransactions = () => {
    return Math.floor((gasToBuy + extraTips) / gasPerTransaction);
  };

  useEffect(() => {
    const calculatePremium = () => {
      return (gasToBuy + extraTips) * ratePerGasUnit;
    };
    setPremium(calculatePremium());
  }, [gasToBuy, extraTips, gasPriceInGwei, ratePerGasUnit]);

  const handleGasChange = (event, newValue) => {
    setGasToBuy(newValue);
  };

  const handleTipsChange = (event, newValue) => {
    setExtraTips(newValue);
  };

  const handleGasPriceChange = event => {
    const newGasPrice = event.target.value ? parseFloat(event.target.value) : 0;
    setGasPriceInGwei(newGasPrice);
  };

  const totalToPay = premium;
  const transactions = calculateTransactions();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box className="form-container" sx={{ margin: '0 auto' }}>
        <Typography variant="h5" gutterBottom>
          Gas spike coverage
        </Typography>
        <Typography variant="body1">Gas to buy</Typography>
        <Slider
          defaultValue={0}
          aria-label="Gas to buy"
          valueLabelDisplay="auto"
          min={0}
          max={10000000}
          onChange={handleGasChange}
        />
        <FormHelperText sx={{ marginBottom: '16px' }}>
          This gas can cover ~ {transactions} ERC-20 Transfer
        </FormHelperText>
        <Typography variant="body1">Extra tips</Typography>
        <Slider
          defaultValue={0}
          aria-label="Extra tips"
          valueLabelDisplay="auto"
          min={0}
          max={10000000}
          onChange={handleTipsChange}
        />
        <DatePicker
          label="Expire date"
          value={selectedDate}
          onChange={newValue => setSelectedDate(newValue)}
          renderInput={params => (
            <TextField {...params} fullWidth margin="normal" />
          )}
        />
        <TextField
          label="Gas Price (Gwei)"
          variant="outlined"
          fullWidth
          margin="normal"
          value={gasPriceInGwei}
          onChange={handleGasPriceChange}
        />
        <Typography variant="body1">
          Premium: {premium.toFixed(5)} ETH
        </Typography>
        <Typography variant="body1">
          Total to Pay: {totalToPay.toFixed(5)} ETH
        </Typography>
        <Button variant="contained" color="primary" fullWidth>
          Submit
        </Button>
      </Box>
    </LocalizationProvider>
  );
};

export default GasSpikeForm;
