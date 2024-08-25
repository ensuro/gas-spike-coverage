import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import './AccountStatus.css';

const AccountStatus = () => {
  return (
    <Box className="account-status-container">
      <Grid container spacing={3} alignItems="center" justifyContent="center">
        <Grid item sm={8} xs={12} md={6} className="account-status-image">
          <img src="eth-gas-logo.png" alt="Gas Pump" />
        </Grid>
        <Grid item sm={4} xs={12} md={6} className="account-status-header">
          <Typography variant="h4" className="account-status">
            Remaining Gas Units
          </Typography>
          <Typography variant="h4" className="gas-units">
            5000 ~ 20 ERC20-Transfer
          </Typography>
          <Typography variant="body1" className="additional-info">
            Average Price ~ 25.31 Gwei
          </Typography>
          <Typography variant="body1" className="additional-info">
            Policy status - (active/claimed)
          </Typography>
          <Typography variant="body1" className="additional-info">
            Expire date - 25/08/2025
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountStatus;
