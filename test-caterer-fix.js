const fetch = require('node-fetch');

// Test script to validate the caterer creation fix
async function testCatererCreationFix() {
  console.log('🧪 Testing caterer creation fix...\n');
  
  // Test data for a new caterer order
  const testOrderData = {
    caterer_name: "Test Caterer Auto-Creation",
    contact_person: "Test Contact",
    caterer_phone: "9999999999", // New phone number that shouldn't exist
    caterer_email: "test@caterer.com",
    caterer_address: "123 Test Street, Test City",
    gst_number: "TESTGST123",
    notes: null,
    cart_items: [
      {
        product_id: null,
        name: "Test Product",
        quantity: 2,
        unit: "kg",
        price: 500,
        originalEnteredAmount: 1000,
        isMix: false,
        isCustom: false
      }
    ],
    subtotal: 1000,
    delivery_fee: 100,
    total_amount: 1100,
    order_source: "caterer_online",
    payment_amount: 550,
    payment_method: "half"
  };
  
  try {
    console.log('📤 Creating caterer order with new caterer...');
    console.log('📝 Test data:', JSON.stringify(testOrderData, null, 2));
    
    const response = await fetch('http://localhost:5000/api/caterer-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrderData)
    });
    
    const result = await response.json();
    
    console.log('\n📥 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS: Order created successfully!');
      console.log('📋 Order Number:', result.data.order_number);
      console.log('💰 Payment Amount:', result.data.payment_amount);
      
      // Verify caterer was created in the database
      console.log('\n🔍 Verifying caterer was created...');
      
      // Check if caterer exists
      const catererCheckResponse = await fetch(`http://localhost:5000/api/caterers?search=${testOrderData.caterer_phone}`);
      const catererCheckResult = await catererCheckResponse.json();
      
      if (catererCheckResult.success && catererCheckResult.caterers.length > 0) {
        const createdCaterer = catererCheckResult.caterers[0];
        console.log('✅ SUCCESS: Caterer was created in the system!');
        console.log('🆔 Caterer ID:', createdCaterer.id);
        console.log('📞 Phone Number:', createdCaterer.phone_number);
        console.log('🏢 Name:', createdCaterer.caterer_name);
      } else {
        console.log('❌ ERROR: Caterer was not found in the system');
      }
      
      // Check if order was created
      console.log('\n🔍 Verifying order was created...');
      const orderCheckResponse = await fetch(`http://localhost:5000/api/caterer-orders/${result.data.id}`);
      const orderCheckResult = await orderCheckResponse.json();
      
      if (orderCheckResult.success) {
        console.log('✅ SUCCESS: Order was created successfully!');
        console.log('📋 Order ID:', orderCheckResult.data.id);
        console.log('📞 Caterer Phone:', orderCheckResult.data.caterer_phone);
        console.log('💰 Total Amount:', orderCheckResult.data.total_amount);
      } else {
        console.log('❌ ERROR: Order was not found in the system');
      }
      
    } else {
      console.log('\n❌ ERROR: Order creation failed');
      console.log('📝 Error message:', result.message);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR: Test failed with exception:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n🧪 Test completed!');
}

// Run the test
testCatererCreationFix().catch(console.error);