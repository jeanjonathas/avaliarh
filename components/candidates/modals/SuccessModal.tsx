import Modal from '../../common/Modal'
import { SuccessModalProps } from '../types'

const SuccessModal = ({ isOpen, onClose, message }: SuccessModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sucesso"
    >
      <div className="mt-2">
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded"
        >
          OK
        </button>
      </div>
    </Modal>
  )
}

export default SuccessModal
