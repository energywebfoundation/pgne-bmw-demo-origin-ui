import { Certificate } from 'ewf-coo'
import { Actions } from '../actions/index'

const defaultState = []

export default function reducer(state =  defaultState, action) {

    switch(action.type) {

        case Actions.certificateCreatedOrUpdated:
            const certificateIndex = state.findIndex((c: Certificate) => c.id === action.certificate.id)
            return certificateIndex === -1 ? 
                [...state, action.certificate] :
                [...state.slice(0,certificateIndex), action.certificate, ...state.slice(certificateIndex + 1)]

        case Actions.multipleCertificatesCreatedOrUpdated:
            let newState = [...state];

            action.certificates.forEach((certificate : Certificate) => {
                const certificateIndex = state.findIndex((c: Certificate) => c.id === action.certificate.id);

                if (certificateIndex === -1) {
                    newState.push(certificate);
                } else {
                    newState = [...state.slice(0, certificateIndex), action.certificate, ...state.slice(certificateIndex + 1)]
                }
            });

            return newState;

        default:
            return state
    }
}

