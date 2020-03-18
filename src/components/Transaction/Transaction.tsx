import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import DataList from '../DataList/DataList';
import Modal from '../Modal/Modal';
import SaveContacts from '../SaveContacts/SaveContacts';
import Spinner from '../Spinner/Spinner';

import { ITransactionProps } from './Types';

import { ADDRESS_VALIDATION } from '../../constants/regExs';
import { INPUT_VALIDATION } from '../../constants/regExs';

import { useRootData } from '../../hooks/useRootData';

import clocks from '../../images/mdi_access_time.svg';

import './Transaction.scss';

const Transaction: React.FC<ITransactionProps> = ({
  addressValue,
  balances,
  hash,
  isExecuted,
  isInput,
  isLoading,
  onChangeAddress,
  onChangeAmount,
  price,
  propsMaxValue,
  propsSymbolName,
  propsToken,
  setHash,
  setExecuted,
  setLoading,
  setTransactionType,
  title,
  transactionAction,
  type,
}): JSX.Element => {
  const {
    ethId,
    searchBalances,
    searchContacts,
    setBalances,
    setContacts,
    setError,
    setModal,
    setWalletAddress,
    verifyToken,
    walletAddress,
    zkBalancesLoaded,
    zkWallet,
  } = useRootData(
    ({
      ethId,
      searchBalances,
      searchContacts,
      setBalances,
      setContacts,
      setError,
      setModal,
      setWalletAddress,
      verifyToken,
      walletAddress,
      zkBalancesLoaded,
      zkWallet,
    }) => ({
      ethId: ethId.get(),
      searchBalances: searchBalances.get(),
      searchContacts: searchContacts.get(),
      setBalances,
      setContacts,
      setError,
      setModal,
      setWalletAddress,
      verifyToken: verifyToken.get(),
      walletAddress: walletAddress.get(),
      zkBalancesLoaded: zkBalancesLoaded.get(),
      zkWallet: zkWallet.get(),
    }),
  );

  const body = document.querySelector('#body');
  const dataPropertySymbol = 'symbol';
  const dataPropertyName = 'name';
  const defaultAddress = walletAddress ? (addressValue = walletAddress) : addressValue;

  const baseBalance = !!balances?.length ? balances[0] : 0;
  const baseMaxValue = !!balances?.length ? balances[0].balance : 0;

  const [fee, setFee] = useState<number>(0);
  const [isBalancesListOpen, openBalancesList] = useState<boolean>(false);
  const [isContactsListOpen, openContactsList] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<number>();
  const [maxValue, setMaxValue] = useState<number>(propsMaxValue ? propsMaxValue : baseMaxValue);
  const [selected, setSelected] = useState<boolean>(false);
  const [selectedBalance, setSelectedBalance] = useState<any>(baseBalance);
  const [selectedContact, setSelectedContact] = useState<any>();
  const [symbolName, setSymbolName] = useState<string>(propsSymbolName ? propsSymbolName : '');
  const [token, setToken] = useState<string | undefined>(propsToken);
  const [unlocked, setUnlocked] = useState<boolean | undefined>(undefined);
  const [unlockFau, setUnlockFau] = useState<boolean>(title === 'Deposit' ? false : true);
  const [value, setValue] = useState<string>(localStorage.getItem('walletName') || '');

  const bigNumberMultiplier = Math.pow(10, 18);
  const selectedSymbol = selectedBalance.symbol !== 'ERC20-1' ? selectedBalance.symbol : 'ERC';

  const validateNumbers = useCallback(
    e => {
      if (INPUT_VALIDATION.digits.test(e)) {
        if (e <= maxValue) {
          setInputValue(+e);
          title === 'Deposit'
            ? onChangeAmount(+e * bigNumberMultiplier - fee)
            : onChangeAmount(+e * bigNumberMultiplier - fee);
        } else {
          setInputValue(+maxValue);
          title === 'Deposit'
            ? onChangeAmount(+maxValue * bigNumberMultiplier - fee - 2 * 179000 * fee)
            : onChangeAmount(+maxValue * bigNumberMultiplier - fee);
        }
      }
    },
    [bigNumberMultiplier, fee, maxValue, onChangeAmount],
  );

  const arr: any = localStorage.getItem(`contacts${zkWallet?.address()}`);
  const contacts = JSON.parse(arr);

  const handleCancel = useCallback(() => {
    setTransactionType(undefined);
    setHash('');
    setExecuted(false);
    setWalletAddress('');
    setLoading(false);
  }, [setExecuted, setHash, setLoading, setTransactionType, setWalletAddress]);

  const setWalletName = useCallback(() => {
    if (value && value !== ethId) {
      localStorage.setItem('walletName', value);
    } else {
      setValue(localStorage.getItem('walletName') || ethId);
    }
  }, [ethId, value]);

  const handleSelect = useCallback(
    name => {
      if (isContactsListOpen) {
        setSelectedContact(name);
      }
      if (isBalancesListOpen) {
        setSelectedBalance(name);
      }
    },
    [isBalancesListOpen, isContactsListOpen],
  );

  const handleClickOutside = useCallback(
    e => {
      if (e.target.getAttribute('data-name')) {
        e.stopPropagation();
        openContactsList(false);
        openBalancesList(false);
        body?.classList.remove('fixed-b');
      }
    },
    [body],
  );

  const handleSave = useCallback(() => {
    if (addressValue && ADDRESS_VALIDATION['eth'].test(addressValue)) {
      setModal('add-contact');
    } else {
      setError(`Error: "${addressValue}" doesn't match ethereum address format`);
    }
  }, [addressValue, setError, setModal]);

  const handleUnlock = useCallback(async () => {
    const changePubkey = await zkWallet?.setSigningKey();
    const receipt = await changePubkey?.awaitReceipt();
    setUnlocked(!!receipt);
  }, [zkWallet]);

  useEffect(() => {
    if (balances?.length && !selected) {
      setToken(balances[0].symbol);
    }
    if (title === 'Withdraw' && zkWallet) {
      setWalletAddress(zkWallet?.address());
      onChangeAddress(zkWallet?.address());
    }
    ethers
      .getDefaultProvider()
      .getGasPrice()
      .then(res => res.toString())
      .then(data => setFee(+data));
    zkWallet
      ?.getAccountState()
      .then(res => (!!res.id ? zkWallet?.isSigningKeySet().then(data => setUnlocked(data)) : setUnlocked(true)));
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [
    balances,
    body,
    fee,
    handleClickOutside,
    isBalancesListOpen,
    isContactsListOpen,
    selected,
    setWalletAddress,
    title,
    zkWallet,
  ]);

  return (
    <>
      <div
        data-name="modal-wrapper"
        className={`modal-wrapper ${isContactsListOpen || isBalancesListOpen ? 'open' : 'closed'}`}
      ></div>
      <Modal visible={false} classSpecifier="add-contact" background={true}>
        <SaveContacts title="Add contact" addressValue={addressValue} addressInput={false} />
      </Modal>
      <div className={`assets-wrapper ${isContactsListOpen || isBalancesListOpen ? 'open' : 'closed'}`}>
        {isContactsListOpen && (
          <DataList
            setValue={setContacts}
            dataProperty={dataPropertyName}
            data={contacts}
            title="Select contact"
            visible={true}
          >
            <button
              onClick={() => {
                openContactsList(false);
                body?.classList.remove('fixed-b');
              }}
              className="close-icon"
            ></button>
            <div className="assets-border-bottom"></div>
            {!!searchContacts ? (
              searchContacts.map(({ address, name }) => (
                <div
                  className="balances-contact"
                  key={name}
                  onClick={() => {
                    handleSelect(name);
                    setWalletAddress(address);
                    onChangeAddress(address);
                    openContactsList(false);
                    body?.classList.remove('fixed-b');
                  }}
                >
                  <div className="balances-contact-left">
                    <p className="balances-contact-name">{name}</p>
                    <span className="balances-contact-address">
                      {address?.replace(address?.slice(6, address?.length - 3), '...')}
                    </span>
                  </div>
                  <div className="balances-contact-right">
                    <></>
                  </div>
                </div>
              ))
            ) : (
              <div>You don't have contacts yet...</div>
            )}
          </DataList>
        )}
        {isBalancesListOpen && (
          <DataList
            setValue={setBalances}
            dataProperty={dataPropertySymbol}
            data={balances}
            title="Select asset"
            visible={true}
          >
            <button
              onClick={() => {
                openBalancesList(false);
                body?.classList.remove('fixed-b');
              }}
              className="close-icon"
            ></button>
            {!!searchBalances.length ? (
              searchBalances.map(({ address, symbol, balance }) => (
                <div
                  onClick={() => {
                    setToken(!!+address ? address : symbol);
                    setMaxValue(balance);
                    setSymbolName(symbol);
                    handleSelect(symbol);
                    openBalancesList(false);
                    setSelected(true);
                    body?.classList.remove('fixed-b');
                  }}
                  key={balance}
                  className="balances-token"
                >
                  <div className="balances-token-left">
                    <div className={`logo ${symbol}`}></div>
                    <div className="balances-token-name">
                      <p>{symbol}</p>
                      <span>
                        {symbol === 'ETH' && <>Ethereum</>}
                        {symbol === 'DAI' && <>Dai</>}
                        {symbol === 'FAU' && <>Faucet</>}
                      </span>
                    </div>
                  </div>
                  <div className="balances-token-right">
                    <span>
                      balance: <p className="datalist-balance">{+balance.toFixed(2)}</p>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div></div>
            )}
          </DataList>
        )}
      </div>
      <div className="transaction-wrapper">
        {isExecuted ? (
          <>
            <button
              onClick={() => {
                handleCancel();
              }}
              className="transaction-back"
            ></button>
            <h2 className="transaction-title">{title} successful!</h2>
            <span className="transaction-field-title">{title} into zk Sync:</span>
            <p className="transaction-field-amount">{inputValue}</p>
            <div className="info-block">
              <p>
                Waiting for the block to be mined... <br /> Wasn’t that easy?
              </p>{' '}
              <img src={clocks} alt="clocks" />
            </div>
            <p className="transaction-hash">
              Tx hash:<span>{typeof hash === 'string' ? hash : hash?.hash}</span>
            </p>
            <button
              className="btn submit-button"
              onClick={() => {
                handleCancel();
                setWalletAddress('');
                setTransactionType(undefined);
              }}
            >
              Go to my wallet
            </button>
          </>
        ) : (
          <>
            {isLoading || unlocked === undefined ? (
              <>
                <Spinner />
                <button
                  className="btn submit-button"
                  onClick={() => {
                    handleCancel();
                    setWalletName();
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    handleCancel();
                    setWalletAddress('');
                    setTransactionType(undefined);
                  }}
                  className="transaction-back"
                ></button>
                <h2 className="transaction-title">{title}</h2>
                {unlocked || title === 'Deposit' ? (
                  <>
                    {isInput && (
                      <>
                        <span className="transaction-field-title">To address</span>
                        <div className="transaction-field contacts">
                          <div className="currency-input-wrapper">
                            <input
                              placeholder="Ox address, ENS or contact name"
                              value={title === 'Withdraw' ? zkWallet?.address() : defaultAddress}
                              onChange={e => onChangeAddress(e.target.value)}
                              className="currency-input-address"
                            />
                            {addressValue && !walletAddress && (
                              <button className="add-contact-button-input" onClick={() => handleSave()}>
                                <span></span>
                                <p>Save</p>
                              </button>
                            )}
                            <div className="custom-selector contacts">
                              <div
                                onClick={() => {
                                  openContactsList(!isContactsListOpen);
                                  body?.classList.add('fixed-b');
                                }}
                                className={`custom-selector-title ${selectedContact ? '' : 'short'}`}
                              >
                                {selectedContact ? <p>{selectedContact}</p> : <span></span>}
                                <div className="arrow-down"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    <span className="transaction-field-title">Amount / asset</span>
                    <div className="transaction-field balance">
                      <div className="currency-input-wrapper border">
                        <input
                          placeholder="0.00"
                          className="currency-input"
                          type="number"
                          step="0.001"
                          onChange={e => {
                            validateNumbers(+e.target.value);
                          }}
                          value={inputValue}
                        />
                        <button
                          className="all-balance"
                          onClick={() => {
                            setInputValue(+maxValue);
                            onChangeAmount((+maxValue - 0.0003) * bigNumberMultiplier - 2 * 179000 * fee);
                          }}
                        >
                          <span>+</span> All balance
                        </button>
                        <div className="custom-selector balances">
                          <div
                            onClick={() => {
                              openBalancesList(!isBalancesListOpen);
                              body?.classList.add('fixed-b');
                            }}
                            className="custom-selector-title"
                          >
                            {symbolName ? (
                              <p>{symbolName !== 'ERC20-1' ? symbolName : 'ERC'}</p>
                            ) : (
                              <span>{zkBalancesLoaded ? selectedSymbol : <Spinner />}</span>
                            )}

                            <div className="arrow-down"></div>
                          </div>
                        </div>
                      </div>
                      {zkBalancesLoaded &&
                        (!!balances?.length ? (
                          <div className="currency-input-wrapper" key={token}>
                            <span>
                              ~$
                              {
                                +(
                                  +(price && !!price[selectedBalance] ? price[selectedBalance] : 1) *
                                  (maxValue ? maxValue : balances[0].balance)
                                ).toFixed(2)
                              }
                            </span>
                            <span>
                              Balance: {maxValue ? +maxValue.toFixed(6) : +balances[0].balance.toFixed(6)}{' '}
                              {symbolName ? symbolName : balances[0].symbol}
                            </span>
                          </div>
                        ) : (
                          <div className="currency-input-wrapper" key={token}>
                            <span>You have no balances</span>
                          </div>
                        ))}
                    </div>
                    {title === 'Deposit' && (
                      <div onClick={() => setUnlockFau(true)} className="fau-unlock-wrapper">
                        {unlockFau ? (
                          <p>
                            {symbolName.length ? symbolName : balances?.length && balances[0].symbol} tocken unlocked
                          </p>
                        ) : (
                          <p>Unlock {symbolName.length ? symbolName : balances?.length && balances[0].symbol} tocken</p>
                        )}
                        <button className={`fau-unlock-tocken ${unlockFau}`}>
                          <span className={`fau-unlock-tocken-circle ${unlockFau}`}></span>
                        </button>
                      </div>
                    )}
                    <button
                      className={`btn submit-button ${!unlockFau && title === 'Deposit' ? 'disabled' : ''}`}
                      onClick={() => (unlockFau ? transactionAction(token, type) : undefined)}
                    >
                      <span
                        className={`submit-label ${title} ${!unlockFau && title === 'Deposit' ? unlockFau : true}`}
                      ></span>
                      {title}
                    </button>
                    <p key={maxValue} className="transaction-fee">
                      Fee:{' '}
                      {balances?.length && (
                        <span>
                          {maxValue ? maxValue * 0.001 : balances[0].balance * 0.001}{' '}
                          {symbolName ? symbolName : balances[0].symbol}
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="info-block center">
                      <p>To control your account you need to unlock it once by registering your public key.</p>
                    </div>
                    <button className="btn submit-button" onClick={handleUnlock}>
                      <span className="submit-label unlock"></span>
                      Unlock
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Transaction;
