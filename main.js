/*
 * tgcalls - a Python binding for C++ library by Telegram
 * pytgcalls - a library connecting the Python binding with MTProto
 * Copyright (C) 2020-2021 Il`ya (Marshal) <https://github.com/MarshalX>
 *
 * This file is part of tgcalls and pytgcalls.
 *
 * tgcalls and pytgcalls is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * tgcalls and pytgcalls is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License v3
 * along with tgcalls. If not, see <http://www.gnu.org/licenses/>.
 */

const LOCAL_OFFER_AREA_ID = 'local_offer';
const REMOTE_SDP_AREA_ID = 'remote_sdp';
const ERROR_ALERT_ID = 'error_alert';

const localOffer = document.getElementById(LOCAL_OFFER_AREA_ID);
const remoteSdp = document.getElementById(REMOTE_SDP_AREA_ID);
const errorAlert = document.getElementById(ERROR_ALERT_ID);

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0,
};
const mediaConstraints = {
    audio: true,
    video: false
};

const pc = new RTCPeerConnection(null);

let inputStream = null;
navigator.mediaDevices.getUserMedia(mediaConstraints).then(stream => {
    inputStream = stream;
    initTracks();
});

const initTracks = () => {
    inputStream.getTracks().forEach(track => {
        track.enabled = true;
        pc.addTrack(track, inputStream);
    });

    createOffer();
}

let offer = null;

const createOffer = () => {
    pc.createOffer(offerOptions).then((sdp) => {
        offer = sdp;
        onOfferReady(sdp);
    });
}

const onOfferReady = (sdp) => {
    pc.setLocalDescription(sdp).catch((e) => errorAlert.innerText = `Error during setting the LOCAL sdp: ${e}`)
    console.debug('Local offer: \n', sdp.sdp);
    localOffer.value = JSON.stringify(getParamsFromParsedSdp(parseSdp(sdp.sdp)));
}

const onConnectBtnClick = () => {
    const sdp = JSON.parse(remoteSdp.value);
    const answer = buildAnswer(sdp);
    console.debug('Answer: \n', answer);
    pc.setRemoteDescription({
        sdp: answer,
        type: 'answer'
    }).catch((e) => errorAlert.innerText = `Error during setting the REMOTE sdp: ${e}`)
}

const buildAnswer = (sdp) => {
    const addCandidates = () => {
        const candidatesSdp = []
        for (const cand of sdp.transport.candidates) {
            candidatesSdp.push(`a=candidate:${cand.foundation} ${cand.component} ${cand.protocol} ${cand.priority} ${cand.ip} ${cand.port} typ ${cand.type} generation ${cand.generation}`);
        }
        return candidatesSdp.join('\n');
    }

    return `v=0
o=- ${new Date().getTime()} 2 IN IP4 0.0.0.0
s=-
t=0 0
a=group:BUNDLE 0
a=ice-lite
m=audio 1 RTP/SAVPF 111 126
c=IN IP4 0.0.0.0
a=mid:0
a=ice-ufrag:${sdp.transport.ufrag}
a=ice-pwd:${sdp.transport.pwd}
a=fingerprint:sha-256 ${sdp.transport.fingerprints[0].fingerprint}
a=setup:passive
${addCandidates()}
a=rtpmap:111 opus/48000/2
a=rtpmap:126 telephone-event/8000
a=fmtp:111 minptime=10; useinbandfec=1; usedtx=1
a=rtcp:1 IN IP4 0.0.0.0
a=rtcp-mux
a=rtcp-fb:111 transport-cc
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=recvonly
`;
}

const getParamsFromParsedSdp = (parsedSdp) => {
    return {
        'fingerprints': [
            {
                'fingerprint': parsedSdp.fingerprint,
                'hash': parsedSdp.hash,
                'setup': 'active'
            }
        ],
        'pwd': parsedSdp.pwd,
        'ssrc': parsedSdp.source,
        'ssrc-groups': [],
        'ufrag': parsedSdp.ufrag
    }
}


// reference https://github.com/evgeny-nadymov/telegram-react/blob/1228bce8adc00b8600d3eafe4a46b29b52a92598/src/Calls/Utils.js#L64
const parseSdp = (sdp) => {
    let lines = sdp.split('\r\n');
    let lookup = (prefix, force = true) => {
        for (let line of lines) {
            if (line.startsWith(prefix)) {
                return line.substr(prefix.length);
            }
        }
        if (force) {
            console.error("Can't find prefix", prefix);
        }
        return null;
    };

    let info = {
        // transport
        fingerprint: lookup('a=fingerprint:').split(' ')[1],
        hash: lookup('a=fingerprint:').split(' ')[0],
        setup: lookup('a=setup:'),
        pwd: lookup('a=ice-pwd:'),
        ufrag: lookup('a=ice-ufrag:'),
    };
    let rawSource = lookup('a=ssrc:', false);
    if (rawSource) {
        info.source = parseInt(rawSource.split(' ')[0]);
    }
    return info;
}
