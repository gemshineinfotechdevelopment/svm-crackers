const syncStock = async () => {
  console.log('ℹ️ Stock tracking has been removed from the application as requested.');
  console.log('ℹ️ If you want to clean up existing stock fields in the database, run: npm run clean:stocks');
  process.exit(0);
};

syncStock();
