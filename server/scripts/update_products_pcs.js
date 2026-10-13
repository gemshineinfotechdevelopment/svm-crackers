const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

function getStandardPcs(name, category, unit) {
  const n = String(name || '').toLowerCase();
  if (n.includes('10p') || n.includes('10 p')) return 10;
  if (n.includes('6in1') || n.includes('6 in 1')) return 6;
  if (n.includes('1 k') || n.includes('1k') || n.includes('1000')) return 1;
  if (n.includes('2 k') || n.includes('2k') || n.includes('2000')) return 1;
  if (n.includes('12 shot')) return 12;
  if (n.includes('30 shot')) return 30;
  if (n.includes('28 item')) return 28;
  if (n.includes('45 item')) return 45;
  if (n.includes('sparkler') || n.includes('sparkel')) return 10;
  if (n.includes('flower pot') || n.includes('flowert pot') || n.includes('koti')) return 10;
  if (n.includes('chakkar') || n.includes('chakkra') || n.includes('wheel')) {
    if (n.includes('spinner') || n.includes('whistling') || n.includes('hot') || n.includes('lottus') || n.includes('tora')) {
      return 5;
    }
    return 10;
  }
  if (n.includes('lakshmi') || n.includes('laxmi') || n.includes('ganesh') || n.includes('lady') || n.includes('20 ply') || n.includes('dlx')) {
    return 5;
  }
  if (n.includes('kuruvi') || n.includes('sound') || n.includes('rocket')) {
    return 10;
  }
  if (unit && unit.toLowerCase() === 'pkt') return 5;
  return 10;
}

async function updateDbProducts(dbName) {
  let uri = process.env.MONGODB_URI;
  if (uri.includes('.mongodb.net/?')) {
    uri = uri.replace('.mongodb.net/?', `.mongodb.net/${dbName}?`);
  }
  const conn = await mongoose.createConnection(uri).asPromise();
  const productsCol = conn.collection('products');
  const prods = await productsCol.find({}).toArray();
  console.log(`\nUpdating ${prods.length} products in [${dbName}]...`);

  let updatedCount = 0;
  for (const p of prods) {
    const pcsVal = getStandardPcs(p.name, p.category, p.unit);
    await productsCol.updateOne(
      { _id: p._id },
      { $set: { pcs: pcsVal } }
    );
    console.log(`  ✓ Updated #${p.slNo} "${p.name}" -> ${pcsVal} Pcs`);
    updatedCount++;
  }
  console.log(`Successfully updated ${updatedCount} products in [${dbName}].`);
  await conn.close();
}

async function main() {
  await updateDbProducts('svm_crackers');
  console.log('\nAll products updated with pcs successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration Error:', err);
  process.exit(1);
});
