import Modal from '../../common/Modal'
import { SuccessModalProps } from '../types'

const SuccessModal = ({ isOpen, onClose, message }: SuccessModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sucesso"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="bg-green-100 rounded-full p-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-secondary-700">{message}</p>
        </div>
        
        <div className="pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SuccessModal
