import { showAlert } from '../contexts/AlertContext';

export { showAlert };

export const Alert = {
  alert: (title, message, buttons, options) => {
    return showAlert(title, message, buttons, options);
  },
};

export default Alert;
