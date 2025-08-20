const clientsData = {
  'Acme LLC': {
    name: 'Acme LLC',
    email: 'nora@acme.com',
    phone: '+971-555-1234',
    country: 'UAE',
    joined: '2024-03-11',
    status: 'Active',
    notes: 'Important client with long-term contract.',
    invoices: [
      { id: 'INV-2025-0042', date: '2025-08-12', total: '$1,200.00', status: 'Sent' },
      { id: 'INV-2025-0038', date: '2025-07-12', total: '$980.00', status: 'Paid' }
    ]
  },
  'Riada Co': {
    name: 'Riada Co',
    email: 'ops@riada.co',
    phone: '+962-6-555-2345',
    country: 'JO',
    joined: '2023-09-02',
    status: 'Active',
    notes: 'Prefers quarterly billing.',
    invoices: [
      { id: 'INV-2025-0041', date: '2025-08-08', total: '$2,400.00', status: 'Paid' }
    ]
  },
  'Nasma Group': {
    name: 'Nasma Group',
    email: 'it@nasma.com',
    phone: '+966-5-555-3456',
    country: 'SA',
    joined: '2022-11-19',
    status: 'Paused',
    notes: 'Two late payments this year.',
    invoices: [
      { id: 'INV-2025-0040', date: '2025-08-05', total: '$1,050.00', status: 'Due Soon' }
    ]
  }
};

const invoicesData = [
  { id: 'INV-2025-0042', client: 'Acme LLC', date: '2025-08-12', total: '$1,200', status: 'Sent' },
  { id: 'INV-2025-0041', client: 'Riada Co', date: '2025-08-08', total: '$2,400', status: 'Paid' },
  { id: 'INV-2025-0040', client: 'Nasma Group', date: '2025-08-05', total: '$1,050', status: 'Due Soon' }
];
