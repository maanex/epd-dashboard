
#ifndef _NETWORK_H_
#define _NETWORK_H_

#define MODE_PART 0
#define MODE_FULL 1

#define ERROR_WIFI_TIMEOUT 0xF1
#define ERROR_MQTT_TIMEOUT 0xF2

extern int net_init(void);

extern void net_provide_callback(std::function<void(int, size_t, size_t, bool, char*)> callback);

#endif
