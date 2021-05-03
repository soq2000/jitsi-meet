// @flow

import React, { Component } from 'react';

import { translate } from '../../../base/i18n';
import { IconRaisedHandHollow } from '../../../base/icons';
import { connect } from '../../../base/redux';
import {
    _mapStateToProps as _abstractMapStateToProps,
    type Props as AbstractProps
} from '../../../chat/components/PrivateMessageButton';
import { isButtonEnabled } from '../../../toolbox/functions.web';

import VideoMenuButton from './VideoMenuButton';
import {
    getLocalVideoTrack,
    getTrackByMediaTypeAndParticipant,
} from '../../../base/tracks';
import { MEDIA_TYPE, VideoTrack } from '../../../base/media';
import { highFive } from '../../../toolbox/actions';
import { getCurrentConference } from '../../../base/conference';

const handpose = require('@tensorflow-models/handpose');
require('@tensorflow/tfjs-backend-webgl');

declare var interfaceConfig: Object;

var checkHighFive;

type Props = AbstractProps & {

    /**
     * True if the private chat functionality is disabled, hence the button is not visible.
     */
    _hidden: boolean
};

/**
 * A custom implementation of the PrivateMessageButton specialized for
 * the web version of the remote video menu. When the web platform starts to use
 * the {@code AbstractButton} component for the remote video menu, we can get rid
 * of this component and use the generic button in the chat feature.
 */
class HighFiveButton extends Component<Props> {
    /**
     * Instantiates a new Component instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        this._onClick = this._onClick.bind(this);
        this.state = {
            currentParticipant: ''
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { participantID, t } = this.props;

        return (
            <VideoMenuButton
                buttonText = { "High Five" }
                icon = { IconRaisedHandHollow }
                id = { `privmsglink_${participantID}` }
                onClick = { this._onClick } />
        );
    }

    _onClick: () => void;

    /**
     * Callback to be invoked on pressing the button.
     *
     * @returns {void}
     */
    _onClick = async  () => {
        const { dispatch, _participant } = this.props;
        if(_participant.id == this.state.currentParticipant){
            clearInterval(checkHighFive);
            this.setState({currentParticipant: ""});
        } else {
            this.setState({currentParticipant: _participant.id});
            const largeVideo = ((document.getElementById('largeVideo'): any): HTMLVideoElement);
            const localVideo = ((document.getElementById('localVideo_container'): any): HTMLVideoElement);

            const isLocal = _participant?.local ?? true;
            const _videoTrack = isLocal
            ? getLocalVideoTrack(tracks) : getTrackByMediaTypeAndParticipant(this.props.tracks, MEDIA_TYPE.VIDEO, _participant.id);
            const jitsiVideoTrack = _videoTrack?.jitsiTrack;
            const videoTrackId = jitsiVideoTrack && jitsiVideoTrack.getId();
            let id  = `remoteVideo_${videoTrackId || ''}`;
            const remoteVideo = ((document.getElementById(id): any): HTMLVideoElement);

            const model = await handpose.load();
            setTimeout(()  => { 
                clearInterval(checkHighFive); 
                this.setState({currentParticipant: ""});
            }, 60000);
            checkHighFive = setInterval(()=>{
                let localHand = false;
                model.estimateHands(localVideo).then(predictions => {
                    console.log('Predictions localVideo: ',predictions);
                    if(predictions.length > 0 && predictions[0].handInViewConfidence > 0.5){
                        localHand = true;
                    }
                });
                model.estimateHands(remoteVideo).then(predictions => {
                    console.log('Predictions remoteVideo: ', predictions);
                    if(predictions.length > 0 && localHand && predictions[0].handInViewConfidence > 0.5){
                        this.props.dispatch(highFive(true));
                        setTimeout(()  => { this.props.dispatch(highFive(false)); }, 4000);
                        this.props.conference.sendCommandOnce('HIGH_FIVE', { value:_participant.id });
                        clearInterval(checkHighFive);
                    }
                });
            }, 100);
        }
    }
}

/**
 * Maps part of the Redux store to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @param {Props} ownProps - The own props of the component.
 * @returns {Props}
 */
function _mapStateToProps(state: Object, ownProps: Props): $Shape<Props> {
    const tracks = state['features/base/tracks'];
    const conference = getCurrentConference(state);
    return {
        ..._abstractMapStateToProps(state, ownProps),
        tracks,
        conference
    };
}

export default translate(connect(_mapStateToProps)(HighFiveButton));
