/**
 * Add Grilled King Salmon entrée via API (similar to populate-menu.ts approach)
 * This avoids the array serialization issues with direct database insertion
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function apiRequest(method: string, endpoint: string, data?: any) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }
  
  return response;
}

async function addGrilledKingSalmonViaAPI() {
  try {
    console.log('🐟 Adding Grilled King Salmon entrée via API...');

    const salmonData = {
      name: "Grilled King Salmon",
      description: "mushroom, tomato, caper, fresh thyme sauce served with scalloped potatoes",
      type: "entree",
      image: "/assets/menu/grilled-king-salmon.jpg",
      allergens: [], // Empty array for now
      dietaryRestrictions: ["gluten-free"],
      price: 0, // Price included in $130 per person
      displayOrder: 20,
      isAvailable: true
    };

    console.log('Creating Grilled King Salmon via API...');
    const response = await apiRequest("POST", "/api/food-options", salmonData);
    const responseData = await response.json();
    
    console.log(`✅ Successfully created Grilled King Salmon with ID: ${responseData.id}`);
    
    return responseData.id;

  } catch (error) {
    console.error('❌ Error adding Grilled King Salmon via API:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🍽️ Treasury 1929 - Menu Update: Adding Grilled King Salmon (via API)');
    console.log('====================================================================');
    
    const salmonId = await addGrilledKingSalmonViaAPI();
    
    console.log('\n✅ Menu update completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`• Added Grilled King Salmon entrée (ID: ${salmonId})`);
    console.log('• Entrée is now available in the food options');
    console.log('\n🎯 Next steps:');
    console.log('• Link salmon to September 2025 events via admin interface');
    console.log('• Replace placeholder image at /assets/menu/grilled-king-salmon.jpg');
    console.log('• Test menu selection in event food options');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the menu update
main();