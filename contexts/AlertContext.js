import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import CustomAlertModal from '../components/CustomAlertModal';

const AlertContext = createContext(null);

// Static holder so showAlert can be triggered from outside React components
let globalAlertHandler = null;

export function registerGlobalAlertHandler(handler) {
  globalAlertHandler = handler;
}

export function unregisterGlobalAlertHandler() {
  globalAlertHandler = null;
}

/**
 * Universal showAlert function that can be imported anywhere.
 * Compatible with Alert.alert(title, message, buttons, options) as well as showAlert({ ... })
 */
export function showAlert(...args) {
  if (globalAlertHandler) {
    return globalAlertHandler(...args);
  } else {
    console.warn('AlertProvider is not mounted yet; unable to show custom alert:', args);
  }
}

// Add shortcut methods
showAlert.cart = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'cart', ...options });

showAlert.success = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'success', ...options });

showAlert.error = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'error', ...options });

showAlert.warning = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'warning', ...options });

showAlert.info = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'info', ...options });

showAlert.confirm = (title, message, buttons, options = {}) =>
  showAlert({ title, message, buttons, type: 'confirm', ...options });

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: undefined,
    icon: undefined,
    cancelable: true,
  });

  const hideAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const triggerAlert = useCallback((firstArg, secondArg, thirdArg, fourthArg) => {
    let config = {};

    if (typeof firstArg === 'object' && firstArg !== null && !Array.isArray(firstArg)) {
      // Called with object: showAlert({ title, message, buttons, type, ... })
      config = {
        title: firstArg.title || '',
        message: firstArg.message || '',
        buttons: firstArg.buttons || [],
        type: firstArg.type,
        icon: firstArg.icon,
        cancelable: firstArg.cancelable !== undefined ? firstArg.cancelable : true,
      };
    } else {
      // Called like Alert.alert(title, message, buttons, options)
      config = {
        title: typeof firstArg === 'string' ? firstArg : '',
        message: typeof secondArg === 'string' ? secondArg : '',
        buttons: Array.isArray(thirdArg) ? thirdArg : [],
        type: fourthArg?.type,
        icon: fourthArg?.icon,
        cancelable: fourthArg?.cancelable !== undefined ? fourthArg.cancelable : true,
      };
    }

    setAlertConfig({
      visible: true,
      ...config,
    });
  }, []);

  useEffect(() => {
    registerGlobalAlertHandler(triggerAlert);
    return () => {
      unregisterGlobalAlertHandler();
    };
  }, [triggerAlert]);

  return (
    <AlertContext.Provider value={{ showAlert: triggerAlert, hideAlert }}>
      {children}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        type={alertConfig.type}
        icon={alertConfig.icon}
        cancelable={alertConfig.cancelable}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    // Return fallback to global showAlert if hook used outside context
    return { showAlert, hideAlert: () => {} };
  }
  return ctx;
}
