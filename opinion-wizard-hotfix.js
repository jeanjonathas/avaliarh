const fs = require('fs');
const path = require('path');

console.log('Applying hotfix for OpinionQuestionWizard.tsx...');

// Path to the file with the TypeScript error
const filePath = path.join(__dirname, 'components', 'admin', 'OpinionQuestionWizard.tsx');

try {
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');

  // Fix the TypeScript error by ensuring errors.text.message is properly typed
  // Replace the problematic line with a safer version that handles the type correctly
  const fixedContent = content.replace(
    /<p className="text-red-500 text-xs mt-0.5">{errors\.text\.message}<\/p>/g,
    '<p className="text-red-500 text-xs mt-0.5">{errors.text?.message?.toString() || "Campo obrigatório"}</p>'
  );

  // Write the fixed content back to the file
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('Hotfix applied successfully to OpinionQuestionWizard.tsx');
} catch (error) {
  console.error('Error applying hotfix:', error);
  process.exit(1);
}
