export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  status?: string
  testDate?: string
  testId?: string
  completed?: boolean
  score?: number
  rating?: number
  observations?: string
  inviteCode?: string
  createdAt: string
  updatedAt: string
}

export interface Test {
  id: string
  title: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CandidatesTableProps {
  initialCandidates: Candidate[]
  onCandidateAdded?: () => void
  onCandidateDeleted?: () => void
  onCandidateUpdated?: () => void
  showAddButton?: boolean
  showDeleteButton?: boolean
  showRatingFilter?: boolean
  showScoreFilter?: boolean
  showStatusFilter?: boolean
  initialStatusFilter?: string
  initialRatingFilter?: string
  initialScoreFilter?: string
  initialSearchTerm?: string
}

export interface AddCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export interface DeleteCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: Candidate
  onSuccess: () => void
}

export interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: Candidate
  onSuccess: (message: string) => void
}

export interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
}

export interface CandidateInfoTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export interface CandidateAnswersTabProps {
  candidate: Candidate
}

export interface CandidateResultsTabProps {
  candidate: Candidate
}

export interface CandidateObservationsTabProps {
  candidate: Candidate
  onUpdate?: () => void
}
