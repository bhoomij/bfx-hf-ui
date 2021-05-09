import React from 'react'
import { useSelector } from 'react-redux'

import {
  getIsRefillBalanceModalVisible,
} from '../../redux/selectors/ui'

import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import Input from '../../ui/Input'

export default function RefillBalanceModal() {
  const isRefillBalanceModalVisible = useSelector(getIsRefillBalanceModalVisible)

  const onRefillBalanceModalClose = () => {
    // const { changeRefillBalanceModalState } = this.props
    // changeRefillBalanceModalState(false)
  }

  const onRefillBalanceModalSubmit = () => { //eslint-disable-line
    // todo
  }

  if (!isRefillBalanceModalVisible) {
    return null
  }

  return (
    <Modal
      label='REFILLING PAPER BALANCES'
      onClose={() => onRefillBalanceModalClose()}
      className='hfui-refillbalance__modal'
      actions={(
        <Button
          green
          onClick={() => onRefillBalanceModalSubmit()}
          label={[
            <p key='text'>Submit</p>,
          ]}
        />
      )}
    >
      <div className='modal-content'>
        <Input placeholder='AAA' />
        <Input placeholder='BBB' />
        <Input placeholder='TESTBTC' />
        <Input placeholder='TESTUSDT' />
        <Input placeholder='TESTUSD' />
      </div>
    </Modal>
  )
}
