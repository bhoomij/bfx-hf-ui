import React, { memo, useState, useEffect } from 'react'

import { useSelector } from 'react-redux'
import {
  useCommonBfxData,
  reduxActions,
  reduxConstants,
  reduxSelectors,
} from 'ufx-ui-core'
import MarketSelect from '../MarketSelect'

import OrderBook from '../OrderBook'
import PanelSettings from '../../ui/PanelSettings'
import Checkbox from '../../ui/Checkbox'
import Panel from '../../ui/Panel'
import { propTypes, defaultProps } from './OrderBookPanel.props'

const { WSSubscribeChannel } = reduxActions
const { SUBSCRIPTION_CONFIG } = reduxConstants
const {
  getBookAsks,
  getBookBids,
  getBookpAsks,
  getBookpBidsDesc,
  getBooktAsks,
  getBooktBids,
  getBookSnapshotReceived,
} = reduxSelectors

const OrderBookPanel = (props) => {
  const {
    onRemove, showMarket, canChangeStacked, moveable,
    removeable, dark, savedState, activeExchange, activeMarket,
  } = props
  const {
    sumAmounts, stackedView, currentExchange = activeExchange, currentMarket = activeMarket,
  } = savedState
  const { base, quote } = currentMarket

  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    isWSConnected,
    symbol,
    dispatch,
  } = useCommonBfxData(base, quote)

  const asks = useSelector(getBookAsks)
  const bids = useSelector(getBookBids)
  const pAsks = useSelector(getBookpAsks)
  const pBids = useSelector(getBookpBidsDesc)
  const tAsks = useSelector(getBooktAsks)
  const tBids = useSelector(getBooktBids)
  const snapshotReceived = useSelector(getBookSnapshotReceived)

  // resubscribe book channel on market change
  useEffect(() => {
    console.log('isWSConnected: ', isWSConnected)
    console.log('symbol: ', symbol)
    if (isWSConnected && symbol) {
      console.log('WSSubscribeChannel: again')
      dispatch(WSSubscribeChannel({
        ...SUBSCRIPTION_CONFIG,
        prec: 'P0',
        symbol,
      }))
    }
  }, [isWSConnected, symbol, dispatch])

  const onToggleSettings = () => {
    setSettingsOpen(state => !state)
  }

  const saveState = (param, value) => {
    const { layoutID, layoutI, updateState } = props

    updateState(layoutID, layoutI, {
      [param]: value,
    })
  }

  const onChangeSumAmounts = (value) => {
    saveState('sumAmounts', value)
  }

  const onChangeStackedView = (value) => {
    saveState('stackedView', value)
  }

  const onChangeMarket = (market) => {
    if (market.restID === currentMarket.restID) {
      return
    }

    saveState('currentMarket', market)
  }

  const renderMarketDropdown = () => {
    const { allMarkets, canChangeMarket } = props

    const markets = allMarkets[currentExchange] || []

    return (
      <MarketSelect
        key='market-dropdown'
        disabled={!canChangeMarket}
        onChange={onChangeMarket}
        value={currentMarket}
        markets={markets}
        renderWithFavorites
      />
    )
  }

  return (
    <Panel
      label='ORDER BOOK'
      dark={dark}
      darkHeader={dark}
      onRemove={onRemove}
      moveable={moveable}
      removeable={removeable}
      secondaryHeaderComponents={[
        showMarket && renderMarketDropdown(),
      ]}
      settingsOpen={settingsOpen}
      onToggleSettings={onToggleSettings}
    >
      {settingsOpen ? (
        <PanelSettings
          onClose={onToggleSettings}
          content={[
            <Checkbox
              key='sum-amounts'
              label='Sum Amounts'
              value={sumAmounts}
              onChange={onChangeSumAmounts}
            />,
            canChangeStacked && (
            <Checkbox
              key='stacked-view'
              label='Stacked View'
              value={stackedView}
              onChange={onChangeStackedView}
            />
            ),
          ]}
        />
      ) : (
        <OrderBook
          stackedView={stackedView}
          sumAmounts={sumAmounts}
          // ufx-ui-core/book props start
          online={isWSConnected}
          asks={asks}
          bids={bids}
          pAsks={pAsks}
          pBids={pBids}
          tAsks={tAsks}
          tBids={tBids}
          loading={!snapshotReceived}
          // ufx-ui-core/book props end
        />
      )}
    </Panel>
  )
}

OrderBookPanel.propTypes = propTypes
OrderBookPanel.defaultProps = defaultProps

export default memo(OrderBookPanel)
