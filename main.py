#  tgcalls - a Python binding for C++ library by Telegram
#  pytgcalls - a library connecting the Python binding with MTProto
#  Copyright (C) 2020-2021 Il`ya (Marshal) <https://github.com/MarshalX>
#
#  This file is part of tgcalls and pytgcalls.
#
#  tgcalls and pytgcalls is free software: you can redistribute it and/or modify
#  it under the terms of the GNU Lesser General Public License as published
#  by the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  tgcalls and pytgcalls is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU Lesser General Public License for more details.
#
#  You should have received a copy of the GNU Lesser General Public License v3
#  along with tgcalls. If not, see <http://www.gnu.org/licenses/>.

import asyncio
import os

import pyrogram
from pytgcalls.mtproto.pyrogram_bridge import PyrogramBridge


async def group_call_participants_update_callback(_):
    pass


async def group_call_update_callback(update):
    print('Copy sdp answer below and paste it on website:')
    print(update.call.params.data)
    exit(0)


async def main(client, input_peer, params):
    app = PyrogramBridge(client)
    app.register_group_call_native_callback(
        group_call_participants_update_callback, group_call_update_callback
    )
    await app.get_and_set_group_call(input_peer)
    await app.resolve_and_set_join_as(None)

    def pre_update_processing():
        pass

    await app.join_group_call(None, params, False, False, pre_update_processing)

    await pyrogram.idle()


if __name__ == '__main__':
    pyro_client = pyrogram.Client(
        os.environ.get('SESSION_NAME'), api_hash=os.environ.get('API_HASH'), api_id=os.environ.get('API_ID')
    )
    pyro_client.start()

    peer = input('Input peer to join (chat/channel): ')
    input_params = input('Paste local offer payload: ')

    loop = asyncio.get_event_loop()
    loop.run_until_complete(main(pyro_client, peer, input_params))
