import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import './Footer.css';

const Footer = () => {
  return (
    <Box sx={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} sm={3} md={3}>
          <Typography variant="h6">Use cases</Typography>
          <ul>
            <li>
              <a href="/#">Gas Price Tracker</a>
            </li>
            <li>
              <a href="/#">Understanding Gas Fees</a>
            </li>
            <li>
              <a href="/#">Gas Savings Tips</a>
            </li>
          </ul>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
          <Typography variant="h6">Blockchain Tools</Typography>
          <ul>
            <li>
              <a href="/#">Block Explorer</a>
            </li>
            <li>
              <a href="/#">Ethereum</a>
            </li>
            <li>
              <a href="/#">ERC20</a>
            </li>
          </ul>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
          <Typography variant="h6">Support & Contact</Typography>
          <ul>
            <li>
              <a href="/#">FAQs</a>
            </li>
            <li>
              <a href="/#">Contact Us</a>
            </li>
            <li>
              <a href="/#">Community Forum</a>
            </li>
          </ul>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Footer;
