require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { VisaConfiguration } = require('../models');
const { DEFAULT_WHATS_INCLUDED, normalizeServiceFee } = require('../controllers/publicController');

async function syncWhatsIncluded() {
  try {
    console.log('Fetching all configurations to verify whats_included...');
    const configs = await VisaConfiguration.findAll();
    console.log(`Found ${configs.length} configurations.`);

    let updatedCount = 0;
    for (const config of configs) {
      const currentFee = config.service_fee;
      const normalizedFee = normalizeServiceFee(currentFee);

      // Check if currentFee was missing or had empty whats_included
      const hadWhatsIncluded = currentFee && typeof currentFee === 'object' && Array.isArray(currentFee.whats_included) && currentFee.whats_included.length > 0;
      
      if (!hadWhatsIncluded) {
        config.service_fee = normalizedFee;
        config.changed('service_fee', true);
        await config.save();
        console.log(`[UPDATED] ID ${config.id}: ${config.citizenship} -> ${config.destination}`);
        updatedCount++;
      } else {
        console.log(`[OK] ID ${config.id}: ${config.citizenship} -> ${config.destination} already had ${currentFee.whats_included.length} deliverables.`);
      }
    }

    console.log(`\nSuccessfully backfilled whats_included for ${updatedCount} configurations.`);
    process.exit(0);
  } catch (error) {
    console.error('Error syncing whats_included:', error);
    process.exit(1);
  }
}

syncWhatsIncluded();
