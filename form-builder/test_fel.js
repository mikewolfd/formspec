import fs from 'fs';
const text = fs.readFileSync('/home/exedev/formspec/form-builder/src/components/properties/fel-expression-input.tsx', 'utf8');
console.log(text.includes('functionSuggestions\n            .filter'));
