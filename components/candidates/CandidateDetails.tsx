import { useState } from 'react'
import { Tab } from '@headlessui/react'
import { Candidate } from './types'
import { CandidateInfoTab } from './tabs/CandidateInfoTab'
import { CandidateAnswersTab } from './tabs/CandidateAnswersTab'
import { CandidateResultsTab } from './tabs/CandidateResultsTab'
import { CandidateObservationsTab } from './tabs/CandidateObservationsTab'

interface CandidateDetailsProps {
  candidate: Candidate
  onClose: () => void
  onUpdate?: () => void
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export const CandidateDetails = ({ candidate, onClose, onUpdate }: CandidateDetailsProps) => {
  const [selectedTab, setSelectedTab] = useState(0)

  const tabs = [
    { name: 'Informações', Component: CandidateInfoTab },
    { name: 'Respostas', Component: CandidateAnswersTab },
    { name: 'Resultados', Component: CandidateResultsTab },
    { name: 'Observações', Component: CandidateObservationsTab },
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 lg:w-3/4 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{candidate.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                  )
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-2">
            {tabs.map((tab, index) => {
              const TabComponent = tab.Component
              return (
                <Tab.Panel key={tab.name} className="rounded-xl bg-white p-3">
                  {index === 3 ? (
                    <TabComponent candidate={candidate} onUpdate={onUpdate} />
                  ) : (
                    <TabComponent candidate={candidate} />
                  )}
                </Tab.Panel>
              )
            })}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}
