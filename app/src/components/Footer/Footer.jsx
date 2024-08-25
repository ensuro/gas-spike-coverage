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
            <li>UI design</li>
            <li>UX design</li>
            <li>Wireframing</li>
          </ul>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
          <Typography variant="h6">Explore</Typography>
          <ul>
            <li>Design</li>
            <li>Prototyping</li>
            <li>Development features</li>
          </ul>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
          <Typography variant="h6">Resources</Typography>
          <ul>
            <li>Blog</li>
            <li>Best practices</li>
            <li>Colors</li>
          </ul>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Footer;
