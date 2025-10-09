import odbc from 'odbc';

const connectionString = 'Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-SVEQ3AJ\\SQLEXPRESS;Database=financial_data;Trusted_Connection=Yes;';

async function testConnection() {
  console.log('Attempting to connect to SQL Server at DESKTOP-SVEQ3AJ\\SQLEXPRESS...');
  let connection;
  try {
    connection = await odbc.connect(connectionString);
    console.log('Connection successful!');
    const result = await connection.query('SELECT @@VERSION AS [SQL Server Version]');
    console.log('SQL Server Version:', result[0]['SQL Server Version']);
  } catch (err) {
    console.error('Connection failed:');
    console.error('Error name:', err.name || 'No name available');
    console.error('Error code:', err.code || 'No code available');
    console.error('Error message:', err.message || 'No detailed message available');
    console.error('Error number:', err.number || 'No number available');
    console.error('Error stack:', err.stack || 'No stack available');
    console.error('Full error object:', JSON.stringify(err, null, 2));
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Connection closed');
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr.message);
      }
    } else {
      console.log('No connection to close');
    }
  }
}

testConnection().catch((err) => {
  console.error('Unexpected error in testConnection:', JSON.stringify(err, null, 2));
});