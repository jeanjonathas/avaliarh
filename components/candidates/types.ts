export interface StageScore {
  id: string
  name: string
  correct: number
  total: number
  percentage: number
  order?: number
}

export interface Response {
  id: string
  questionId: string
  optionId: string
  questionText: string
  optionText: string
  isCorrectOption: boolean
  stageName?: string
  stageId?: string
  categoryName?: string
  questionSnapshot?: string | any
  allOptionsSnapshot?: string | any
  question?: {
    stage?: {
      id: string
      title: string
    }
    category?: {
      id: string
      name: string
    }
  }
  option?: {
    id: string
    text: string
    isCorrect: boolean
  }
  candidateId: string
  isCorrect: boolean
  timeSpent?: number
  createdAt: string
  updatedAt: string
}

export interface CandidateScore {
  correct: number
  total: number
  percentage: number
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  testDate?: string
  interviewDate?: string
  testId?: string
  completed?: boolean
  score?: CandidateScore
  rating?: number
  observations?: string
  inviteCode?: string
  inviteExpires?: string
  inviteSent?: boolean
  inviteAttempts?: number
  infoJobsLink?: string
  socialMediaUrl?: string
  resumeFile?: string
  linkedin?: string
  github?: string
  portfolio?: string
  resumeUrl?: string
  photoUrl?: string
  timeSpent?: number
  stageScores?: StageScore[]
  responses?: Response[]
  test?: {
    id: string
    title: string
    description?: string
    testStages: {
      stageId: string
      stage: {
        id: string
        title: string
      }
      order: number
    }[]
  }
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
