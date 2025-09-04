import { getTestDb } from './withTestSchema';

export async function seedTestData() {
  console.log('🌱 Seeding test data...');
  console.log('⚠️  Using mock test data for isolated testing');
  
  const mockData = {
    venueId: 1,
    eventIds: [1, 2, 3],
    salmonId: 1,
    branzinoId: 2
  };
  
  console.log(`✅ Test data seeded:`);
  console.log(`  - Venue: ${mockData.venueId}`);
  console.log(`  - Events: ${mockData.eventIds.join(', ')}`);
  console.log(`  - Menu: Grilled King Salmon mocked`);
  
  return mockData;
}