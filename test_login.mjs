#!/usr/bin/env node

const testAccounts = [
  { phone: '+237 600000001', pin: '1234', type: 'standard', expectedType: 'standard' },
  { phone: '+237 612345678', pin: '1234', type: 'professional', expectedType: 'professional' },
  { phone: '+237 699999999', pin: '1234', type: 'pharmacist', expectedType: 'pharmacist' },
  { phone: 'admin', pin: 'admin', type: 'admin', expectedType: 'admin' },
];

async function testLogin(phone, pin, type, expectedType) {
  try {
    const response = await fetch('http://localhost:3500/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, pin, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error, status: response.status };
    }

    const data = await response.json();
    const success = data.type === expectedType;

    return {
      success,
      userType: data.type,
      expectedType,
      name: data.name,
      phone: data.phone
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log('🔍 Testing TAKYMED account authentication...\n');

  for (const account of testAccounts) {
    console.log(`Testing ${account.type.toUpperCase()} account (${account.phone})...`);
    const result = await testLogin(account.phone, account.pin, account.type, account.expectedType);

    if (result.success) {
      console.log(`✅ SUCCESS: ${result.name} (${result.userType})`);
    } else {
      console.log(`❌ FAILED: ${result.error || 'Unexpected type: ' + result.userType}`);
    }
    console.log('');
  }
}

runTests().catch(console.error);
