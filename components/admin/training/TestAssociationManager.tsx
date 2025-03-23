import React, { useState } from 'react';
import TestSelectorModal, { TestSelectorTarget } from './TestSelectorModal';
import TestAssociationButton from './TestAssociationButton';

interface Test {
  id: string;
  name: string;
  description?: string;
}

interface TestAssociationManagerProps {
  tests: Test[];
  onAssociateTest: (target: TestSelectorTarget, testId: string) => void;
  onRemoveTest: (target: TestSelectorTarget) => void;
  type: 'course' | 'module' | 'lesson';
  hasTest: boolean;
  moduleIndex?: number;
  lessonIndex?: number;
  compact?: boolean;
}

const TestAssociationManager: React.FC<TestAssociationManagerProps> = ({
  tests,
  onAssociateTest,
  onRemoveTest,
  type,
  hasTest,
  moduleIndex,
  lessonIndex,
  compact = false
}) => {
  const [showTestSelector, setShowTestSelector] = useState(false);
  
  const handleOpenSelector = () => {
    setShowTestSelector(true);
  };
  
  const handleCloseSelector = () => {
    setShowTestSelector(false);
  };
  
  const handleSelectTest = (testId: string) => {
    const target: TestSelectorTarget = {
      type,
      index: moduleIndex,
      lessonIndex
    };
    onAssociateTest(target, testId);
    setShowTestSelector(false);
  };
  
  const handleRemoveTest = () => {
    const target: TestSelectorTarget = {
      type,
      index: moduleIndex,
      lessonIndex
    };
    onRemoveTest(target);
  };
  
  return (
    <>
      <TestAssociationButton
        hasTest={hasTest}
        onAssociate={handleOpenSelector}
        onRemove={handleRemoveTest}
        type={type}
        compact={compact}
      />
      
      <TestSelectorModal
        isOpen={showTestSelector}
        onClose={handleCloseSelector}
        tests={tests}
        onSelectTest={handleSelectTest}
        target={{
          type,
          index: moduleIndex,
          lessonIndex
        }}
      />
    </>
  );
};

export default TestAssociationManager;
