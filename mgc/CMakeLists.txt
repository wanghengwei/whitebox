cmake_minimum_required(VERSION 3.11)

include(FetchContent)

FetchContent_Declare(mgc
    SVN_REPOSITORY http://172.17.100.22/svn/starx52/video_platform
    SVN_USERNAME wanghengwei
    SVN_PASSWORD wanghengwei
)
FetchContent_GetProperties(mgc)
if(NOT mgc_POPULATED)
    FetchContent_Populate(mgc)
endif()

set(MGC_SOURCES
video_platform_impl/share/game_event/EventFragmentManager.cpp
video_platform_impl/common/event/room_proxy_wrap_events.cpp
video_platform_impl/user_proxy/event/room_proxy_events.cpp
video_platform_impl/common/event/video_room_client_server_event_register.cpp
video_platform_impl/common/event/video_ceremony_event_register.cpp
video_platform_impl/modules/video_chat/event/video_chat_event_register.cpp
video_platform_impl/common/event/video_personal_card_event_register.cpp
video_platform_impl/common/event/event_connect_init_register.cpp
video_platform_impl/modules/video_vip/shared/event/video_vip_event_register.cpp
video_platform_impl/common/event/video_vote_event_register.cpp
video_platform_impl/modules/video_activity/event/video_activity_event_register.cpp
video_platform_impl/modules/raffle/shared/event/video_raffle_event_register.cpp
video_platform_impl/video_server/event/video_server_event_reg.cpp
video_platform_impl/common/event/bid_recommend_room_event_register.cpp
video_platform_impl/modules/surprise_box/event/surprise_box_event_register.cpp
video_platform_impl/modules/video_guild/share/event/event_video_guild_reg.cpp
video_platform_impl/share/date_time.cpp
video_platform_impl/common/transmit/EventTransmit.cpp
video_platform_impl/modules/anchor_nest/events/anchor_nest_event_reg.cpp
video_platform_impl/modules/anchor_pk/event/anchor_pk_event_reg.cpp
video_platform_impl/modules/anchor_task/shared/event/event_anchor_task_reg.cpp
video_platform_impl/modules/concert/events/concert_event_reg.cpp
video_platform_impl/modules/dream_box/event/dream_box_event_reg.cpp
video_platform_impl/modules/nest_task/event/nest_task_event_reg.cpp
video_platform_impl/modules/new_growth/event/event_new_growth_reg.cpp
video_platform_impl/modules/rand_nick/event/event_rand_nick_reg.cpp
video_platform_impl/modules/red_envelope/share/red_envelope_event_reg.cpp
video_platform_impl/modules/split_screen/event/event_split_screen_reg.cpp
video_platform_impl/common/event/event_clear_room_register.cpp
video_platform_impl/common/event/anchor_sync_info_event_register.cpp
video_platform_impl/common/event/event_edit_account_register.cpp
video_platform_impl/common/event/event_video_room.cpp
video_platform_impl/common/event/video_personal_card_event_register.cpp
)

list(TRANSFORM MGC_SOURCES PREPEND "${mgc_SOURCE_DIR}/")

# add_library(mgc ${MGC_SRC})
set(MGC_INCLUDE_DIRS
    ${mgc_SOURCE_DIR} 
    ${mgc_SOURCE_DIR}/share
    ${mgc_SOURCE_DIR}/video_platform_impl
    ${mgc_SOURCE_DIR}/video_platform_impl/share
    ${mgc_SOURCE_DIR}/video_platform_impl/common
)
# target_compile_options(mgc 
#     PRIVATE 
#         -include limits.h
#     PUBLIC
#         -Wno-deprecated-declarations
# )

set(MGC_SOURCES ${MGC_SOURCES} PARENT_SCOPE)
set(MGC_INCLUDE_DIRS ${MGC_INCLUDE_DIRS} PARENT_SCOPE)