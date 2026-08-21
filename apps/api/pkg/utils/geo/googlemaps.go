package geo

import (
	"errors"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Place คือพิกัดที่แกะได้จากลิงก์ Google Maps
type Place struct {
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
	Label string  `json:"label"`
}

var (
	ErrNotGoogleMaps = errors.New("ลิงก์นี้ไม่ใช่ลิงก์ Google Maps")
	ErrNoCoordinates = errors.New("แกะพิกัดจากลิงก์นี้ไม่ได้ — กรุณาคัดลอกลิงก์จากปุ่ม แชร์ ใน Google Maps อีกครั้ง")

	// รูปแบบที่พบจริงจากปุ่ม "แชร์" และจาก address bar:
	//   /maps/place/<ชื่อ>/@13.7563,100.5018,17z
	//   /maps/@13.7563,100.5018,17z
	//   ?q=13.7563,100.5018   หรือ  ?ll=13.7563,100.5018
	//   /maps/place/.../data=!3d13.7563!4d100.5018
	atPattern    = regexp.MustCompile(`@(-?\d+\.\d+),(-?\d+\.\d+)`)
	queryPattern = regexp.MustCompile(`^(-?\d+\.\d+),\s*(-?\d+\.\d+)$`)
	dataPattern  = regexp.MustCompile(`!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)`)
	placePattern = regexp.MustCompile(`/maps/place/([^/@]+)`)
)

var allowedHosts = map[string]bool{
	"maps.app.goo.gl":  true,
	"goo.gl":           true,
	"maps.google.com":  true,
	"www.google.com":   true,
	"google.com":       true,
	"www.google.co.th": true,
	"google.co.th":     true,
}

// resolveClient ไม่ตาม redirect อัตโนมัติ เพราะเราต้องอ่านค่า Location เอง
// และต้องตรวจปลายทางทุกช่วงก่อนยิงต่อ
var resolveClient = &http.Client{
	Timeout: 8 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

// ResolveGoogleMapsURL แปลงลิงก์ Google Maps เป็นพิกัด
//
// ลิงก์แบบย่อ (maps.app.goo.gl) ไม่มีพิกัดอยู่ในตัว URL จึงต้องยิง HEAD ไปอ่าน Location
// ซึ่งทำจากเบราว์เซอร์ไม่ได้เพราะติด CORS — เป็นเหตุผลที่ฟีเจอร์นี้ต้องมี backend
func ResolveGoogleMapsURL(raw string) (*Place, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, ErrNotGoogleMaps
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" {
		return nil, ErrNotGoogleMaps
	}
	if !allowedHosts[strings.ToLower(parsed.Host)] {
		return nil, ErrNotGoogleMaps
	}

	if place := extractFromURL(parsed); place != nil {
		return place, nil
	}

	// ลิงก์ย่อ — ตาม redirect ทีละชั้น (จำกัดจำนวนชั้นกันวนไม่รู้จบ)
	current := parsed
	for hop := 0; hop < 5; hop++ {
		next, err := followRedirect(current)
		if err != nil || next == nil {
			break
		}
		if !allowedHosts[strings.ToLower(next.Host)] {
			return nil, ErrNotGoogleMaps
		}
		if place := extractFromURL(next); place != nil {
			return place, nil
		}
		current = next
	}

	return nil, ErrNoCoordinates
}

func followRedirect(u *url.URL) (*url.URL, error) {
	if err := guardPublicHost(u.Hostname()); err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodHead, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "MingHe/1.0 (+https://minghe.work)")

	res, err := resolveClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	location := res.Header.Get("Location")
	if location == "" {
		return nil, nil
	}
	return u.Parse(location)
}

// guardPublicHost กันไม่ให้ลิงก์ที่ผู้ใช้ส่งมาชี้กลับเข้าเครือข่ายภายใน (SSRF)
func guardPublicHost(host string) error {
	ips, err := net.LookupIP(host)
	if err != nil {
		return err
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() {
			return errors.New("blocked host")
		}
	}
	return nil
}

func extractFromURL(u *url.URL) *Place {
	full := u.String()
	label := extractLabel(u)

	if m := dataPattern.FindStringSubmatch(full); len(m) == 3 {
		return toPlace(m[1], m[2], label)
	}
	if m := atPattern.FindStringSubmatch(full); len(m) == 3 {
		return toPlace(m[1], m[2], label)
	}

	q := u.Query()
	for _, key := range []string{"q", "ll", "center", "daddr"} {
		if m := queryPattern.FindStringSubmatch(strings.TrimSpace(q.Get(key))); len(m) == 3 {
			return toPlace(m[1], m[2], label)
		}
	}
	return nil
}

func extractLabel(u *url.URL) string {
	m := placePattern.FindStringSubmatch(u.Path)
	if len(m) != 2 {
		return ""
	}
	decoded, err := url.PathUnescape(m[1])
	if err != nil {
		return ""
	}
	return strings.ReplaceAll(decoded, "+", " ")
}

func toPlace(latStr, lngStr, label string) *Place {
	lat, err1 := strconv.ParseFloat(latStr, 64)
	lng, err2 := strconv.ParseFloat(lngStr, 64)
	if err1 != nil || err2 != nil || lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		return nil
	}
	return &Place{Lat: lat, Lng: lng, Label: label}
}

// SolarTimeOffsetMinutes คืนส่วนต่างระหว่างเวลานาฬิกากับเวลาสุริยะจริง (真太陽時)
//
// คิดจากลองจิจูดเทียบกับเส้นกลางของโซนเวลา ยังไม่รวม equation of time
// ซึ่งเป็นส่วนที่ engine ปาจือใน packages/core รับผิดชอบ
func SolarTimeOffsetMinutes(lng float64, timezoneOffsetHours float64) int {
	meridian := timezoneOffsetHours * 15.0
	return int((lng - meridian) * 4.0)
}
