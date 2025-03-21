const fs = require('fs');
const path = require('path');

console.log('Applying hotfix for OpinionQuestionWizard.tsx...');

// Path to the file with the TypeScript error
const filePath = path.join(__dirname, 'components', 'admin', 'OpinionQuestionWizard.tsx');

try {
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');

  // Find all instances of error message display
  const errorPattern = /<p className="text-red-500 text-xs mt-0\.5">\{errors\.(\w+)\.message\}<\/p>/g;
  
  // Replace all instances with a type-safe version
  const fixedContent = content.replace(
    errorPattern,
    (match, fieldName) => `<p className="text-red-500 text-xs mt-0.5">{String(errors.${fieldName}?.message || "Campo obrigatório")}</p>`
  );

  // Write the fixed content back to the file
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('Hotfix applied successfully to OpinionQuestionWizard.tsx');
  
  // Verify the fix was applied
  const verifyContent = fs.readFileSync(filePath, 'utf8');
  if (verifyContent.includes('String(errors.text?.message || "Campo obrigatório")')) {
    console.log('Verification successful: Hotfix was correctly applied');
  } else {
    console.log('Warning: Hotfix may not have been applied correctly. Manual inspection needed.');
    
    // Direct fix for the specific line mentioned in the error
    const directFix = verifyContent.replace(
      /<p className="text-red-500 text-xs mt-0\.5">\{errors\.text\.message\}<\/p>/,
      '<p className="text-red-500 text-xs mt-0.5">{String(errors.text?.message || "Campo obrigatório")}</p>'
    );
    
    fs.writeFileSync(filePath, directFix, 'utf8');
    console.log('Applied direct fix to line 700');
  }
} catch (error) {
  console.error('Error applying hotfix:', error);
  process.exit(1);
}
