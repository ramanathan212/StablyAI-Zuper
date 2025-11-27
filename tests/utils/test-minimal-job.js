/**
 * Test script to find minimum required fields for job creation
 */

const config = {
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
  headers: {
    'accept': 'application/json, text/plain, */*',
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
    'content-type': 'application/json',
    'x-zuper-client': 'WEB_APP',
    'x-zuper-client-version': '3.0'
  }
};

const testPayloads = [
  {
    name: 'Basic with job wrapper',
    payload: {
      job: {
        title: 'Test Job 001',
        job_category_uid: '285e6d01-1449-4f38-8cd6-091738e15e0f',
        customer_uid: '0711961e-954f-4e41-9f42-b769965e40b5'
      }
    }
  },
  {
    name: 'With customer_uid and category_uid (no wrapper)',
    payload: {
      title: 'Test Job 002',
      job_category_uid: '285e6d01-1449-4f38-8cd6-091738e15e0f',
      customer_uid: '0711961e-954f-4e41-9f42-b769965e40b5'
    }
  },
  {
    name: 'With customer_uid, category_uid, and times',
    payload: {
      title: 'Test Job 003',
      job_category_uid: '285e6d01-1449-4f38-8cd6-091738e15e0f',
      customer_uid: '0711961e-954f-4e41-9f42-b769965e40b5',
      scheduled_start_time: new Date().toISOString(),
      scheduled_end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

async function testJobCreation() {
  for (const test of testPayloads) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log('Payload:', JSON.stringify(test.payload, null, 2));

    try {
      const response = await fetch(`${config.apiUrl}/jobs`, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(test.payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(data, null, 2));
        return; // Stop on first success
      } else {
        const errorText = await response.text();
        console.log(`❌ FAILED: ${response.status} ${response.statusText}`);
        console.log('Error:', errorText);
      }
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }
}

testJobCreation();
