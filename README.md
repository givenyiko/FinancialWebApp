# Financial Data Visualization App

A full-stack web application for uploading and visualizing financial data from Excel files.

## Features

- Upload Excel files (.xlsx) with financial data
- Store data in MySQL database
- Display data in interactive table and bar chart
- Responsive design
- Error handling and validation

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server

## Setup Instructions

### 1. Database Setup

```sql
-- Run the database.sql file in your MySQL server
mysql -u root -p < backend/database.sql
