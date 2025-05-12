import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - list key files to export
const filesToExport = [
  // Client components
  'client/src/components/DirectPaymentLink.tsx',
  'client/src/components/booking/CheckoutForm.tsx',
  'client/src/components/booking/OtpPaymentForm.tsx',
  'client/src/pages/StandalonePaymentPage.tsx',
  'client/src/pages/backoffice/PaymentLinksPage.tsx',
  
  // Server routes and payment handlers
  'server/routes.ts',
  'server/routes-direct.ts',
  'server/routes-otp.ts',
  'server/routes-payment.ts',
  'server/routes-standalone.ts',
  'server/stripe.ts',
  
  // Auth and session handling
  'server/auth.ts',
  'client/src/hooks/use-auth.tsx',
  'client/src/lib/queryClient.ts',
  
  // Configuration files
  'vite.config.ts',
  'tsconfig.json',
  'package.json',
];

// Create export directory
const exportDir = path.join(__dirname, '../payment-debug-export');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// Copy files to export directory
filesToExport.forEach(filePath => {
  try {
    const sourcePath = path.join(__dirname, '..', filePath);
    
    // Create directories if they don't exist
    const targetPath = path.join(exportDir, filePath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy the file
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ Exported: ${filePath}`);
    } else {
      console.log(`⚠ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error exporting ${filePath}:`, error);
  }
});

// Create README with debugging instructions
const readmeContent = `# Payment System Debug Package

This package contains key files related to the payment system for debugging purposes.

## Structure

- \`client/\`: Frontend components and pages related to payment processing
- \`server/\`: Backend routes and handlers for payment APIs
- Configuration files (vite.config.ts, tsconfig.json, package.json)

## Common Issues

1. Session persistence problems between pages
2. CORS issues with Stripe elements
3. Authentication failures during payment flow
4. Stripe API key configuration

## Debugging Steps

1. Check browser console for errors during payment processes
2. Verify Stripe public key is correctly loaded
3. Examine network requests during payment flow
4. Test standalone payment page without authentication

## Required Environment Variables

- \`STRIPE_SECRET_KEY\`: Stripe secret key (server-side)
- \`VITE_STRIPE_PUBLIC_KEY\`: Stripe publishable key (client-side)
`;

fs.writeFileSync(path.join(exportDir, 'README.md'), readmeContent);
console.log('\n✓ Created README.md with debugging instructions');

console.log(`\n✅ Export complete! Files saved to: ${exportDir}`);
console.log('Download this directory as a ZIP file for external debugging.');