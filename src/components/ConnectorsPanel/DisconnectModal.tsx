import React, { useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { btnSecondaryLg, btnDangerLg } from '../../styles/common';
import { ModalShell } from '../ModalShell';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
    connectorName: string | null;
    onConfirm: () => void;
    onClose: () => void;
}

const DisconnectModal: React.FC<Props> = ({ connectorName, onConfirm, onClose }) => {
    const { t } = useTranslation();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (connectorName && modalRef.current) {
            const btn = modalRef.current.querySelector<HTMLButtonElement>(
                '.connector-modal-actions button:last-child',
            );
            btn?.focus();
        }
    }, [connectorName]);

    return (
        <ModalShell open={connectorName !== null} onClose={onClose} width={420}>
            <div ref={modalRef}>
                <div className="connector-modal-header">
                    <AlertTriangle size={24} color="#ef4444" aria-hidden="true" />
                    <h3 className="connector-modal-title">Revoke Connection?</h3>
                </div>
                <p className="connector-modal-body">
                    This will revoke the OAuth token and disconnect the service. You can reconnect
                    at any time.
                </p>
                <div className="connector-modal-actions">
                    <button onClick={onClose} className="btn-secondary" style={btnSecondaryLg}>
                        {t('common.cancel')}
                    </button>
                    <button onClick={onConfirm} style={btnDangerLg}>
                        Yes, Revoke
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

export default DisconnectModal;
