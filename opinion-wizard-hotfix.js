const fs = require('fs');
const path = require('path');

console.log('Applying OpinionQuestionWizard TypeScript error hotfix...');

// Path to the file with the error
const filePath = path.join(__dirname, 'components/admin/OpinionQuestionWizard.tsx');

try {
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the problematic line and fix it by adding a toString() or String() conversion
  // Original: <p className="text-red-500 text-xs mt-0.5">{errors.text.message}</p>
  // Fixed: <p className="text-red-500 text-xs mt-0.5">{errors.text.message?.toString()}</p>
  
  content = content.replace(
    /<p className="text-red-500 text-xs mt-0.5">\{errors\.text\.message\}<\/p>/g,
    '<p className="text-red-500 text-xs mt-0.5">{errors.text.message?.toString()}</p>'
  );
  
  // If the above replacement doesn't work, try a more general approach
  content = content.replace(
    /\{errors\.text\.message\}/g,
    '{errors.text.message?.toString()}'
  );
  
  // Write the fixed content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OpinionQuestionWizard TypeScript error hotfix applied successfully!');
} catch (error) {
  console.error('Error applying OpinionQuestionWizard hotfix:', error);
}
