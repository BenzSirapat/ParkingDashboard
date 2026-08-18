import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'singha-parking-lang'
const LangContext = createContext(null)

// English strings are the lookup keys; Thai values map from them.
// Anything missing simply falls back to the English key.
const TH = {
  // chrome
  'Dashboards': 'แดชบอร์ด',
  'Reports': 'รายงาน',
  'Language': 'ภาษา',
  'Toggle theme': 'สลับธีม',
  'Sign out': 'ออกจากระบบ',
  'Operator': 'เจ้าหน้าที่',
  'Singha Parking · operations overview': 'สิงห์ พาร์กกิ้ง · ภาพรวมการดำเนินงาน',

  // sites (executive filter)
  'Site': 'สาขา',
  'All Sites': 'ทุกสาขา',
  'All sites consolidated · executive overview': 'รวมทุกสาขา · ภาพรวมสำหรับผู้บริหาร',
  'site overview': 'ภาพรวมสาขา',
  'Site Comparison': 'เปรียบเทียบรายสาขา',
  'Every site in the consolidated total': 'ทุกสาขาที่รวมอยู่ในยอดรวม',
  'Revenue contribution of every site in the total': 'สัดส่วนรายได้ของแต่ละสาขาในยอดรวม',
  'Entry volume of every site in the total': 'ปริมาณรถเข้าของแต่ละสาขาในยอดรวม',
  'Stamp validations of every site in the total': 'จำนวนการประทับตราของแต่ละสาขาในยอดรวม',
  'Vehicle volume of every site in the total': 'ปริมาณรถของแต่ละสาขาในยอดรวม',
  'Opportunity loss of every site in the total': 'ค่าเสียโอกาสของแต่ละสาขาในยอดรวม',
  'Daily Trend by Site': 'แนวโน้มรายวันแยกตามสาขา',
  'Stacked — bar height is the all-sites total': 'กราฟซ้อน — ความสูงของแท่งคือยอดรวมทุกสาขา',
  'of total': 'ของยอดรวม',
  'Tip: pick a single site in the top bar to drill down.': 'เคล็ดลับ: เลือกสาขาที่แถบด้านบนเพื่อดูรายละเอียดรายสาขา',
  'Revenue': 'รายได้',
  'Avg Ticket': 'ค่าเฉลี่ยต่อบิล',
  'Members': 'สมาชิก',
  'Visitors': 'ผู้มาติดต่อ',
  'Share of Revenue': 'สัดส่วนรายได้',
  'Share of Entries': 'สัดส่วนรถเข้า',
  'Live · demo dataset': 'ออนไลน์ · ข้อมูลตัวอย่าง',
  'All rights reserved.': 'สงวนลิขสิทธิ์',
  'Terms & Conditions · Privacy & Policy': 'ข้อกำหนดและเงื่อนไข · นโยบายความเป็นส่วนตัว',

  // nav
  'Sales Dashboard': 'แดชบอร์ดยอดขาย',
  'Transaction Dashboard': 'แดชบอร์ดการเข้าออก',
  'Stamp Dashboard': 'แดชบอร์ดแสตมป์',
  'Vehicle Dashboard': 'แดชบอร์ดยานพาหนะ',
  'Opportunity Loss Dashboard': 'แดชบอร์ดค่าเสียโอกาส',
  'Detailed Sales Tax Report': 'รายงานภาษีขายแบบละเอียด',
  'Vehicle Transaction Report': 'รายงานการเข้าออก',
  'Stamp Report': 'รายงานแสตมป์',
  'License Plate Reading Issue': 'รายงานการอ่านป้ายทะเบียน',
  'Opportunity Loss Summary': 'รายงานค่าเสียโอกาสแบบสรุป',
  'Vehicle Volume Time Period': 'ปริมาณรถตามช่วงเวลา',
  'Dashboard Member Visitor': 'สมาชิกและผู้มาติดต่อ',
  'Discount Report': 'รายงานส่วนลด',
  'Package Member Report': 'รายงานสมาชิกแพ็กเกจ',
  'Cash or Online Payment': 'เงินสด / ชำระออนไลน์',

  // login
  'Sign in': 'เข้าสู่ระบบ',
  'Please sign in to access the dashboard.': 'กรุณาเข้าสู่ระบบเพื่อใช้งานแดชบอร์ด',
  'Username': 'ชื่อผู้ใช้',
  'Password': 'รหัสผ่าน',
  'Signing in…': 'กำลังเข้าสู่ระบบ…',
  'Welcome back': 'ยินดีต้อนรับกลับ',
  'Monitor traffic, revenue and tenant validations across your parking complex — all in one friendly dashboard.':
    'ติดตามปริมาณรถ รายได้ และการประทับตราของผู้เช่า ในแดชบอร์ดเดียวที่ใช้งานง่าย',
  'Real-time In / Out summary': 'สรุปการเข้า-ออกแบบเรียลไทม์',
  'Revenue & stamp-discount tracking': 'ติดตามรายได้และส่วนลดจากแสตมป์',
  'Per-tenant reports with CSV / Excel export': 'รายงานรายผู้เช่า ส่งออก CSV / Excel',
  'Demo credentials —': 'บัญชีทดลอง —',
  'Invalid username or password.': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',

  // range presets
  'Today': 'วันนี้',
  'Last 7 days': '7 วันล่าสุด',
  'Last 30 days': '30 วันล่าสุด',
  'Last 90 days': '90 วันล่าสุด',

  // actions / common
  'Search': 'ค้นหา',
  'Export PDF': 'ส่งออก PDF',
  'CSV': 'CSV',
  'Excel': 'Excel',
  'Results': 'ผลลัพธ์',
  'records': 'รายการ',
  'record': 'รายการ',
  'No data': 'ไม่มีข้อมูล',
  'No data — adjust filters and search again.': 'ไม่มีข้อมูล — ปรับตัวกรองแล้วค้นหาอีกครั้ง',
  'No data for chart': 'ไม่มีข้อมูลสำหรับแสดงกราฟ',

  // hint labels
  'Sales Overview': 'ภาพรวมยอดขาย',
  'Vehicle Entry / Exit Overview': 'ภาพรวมการเข้า-ออกของรถ',
  'Discount Stamp Usage Overview': 'ภาพรวมการใช้แสตมป์ส่วนลด',
  'Vehicle Traffic by Time Period': 'ปริมาณรถตามช่วงเวลา',
  'Overview of Opportunity Loss from Stamp Usage': 'ภาพรวมค่าเสียโอกาสจากการใช้แสตมป์',

  // KPI labels + subs
  'Total Revenue': 'รายได้รวม',
  'VAT included': 'รวม VAT แล้ว',
  'Total Transactions': 'จำนวนธุรกรรม',
  'Paid & exited': 'ชำระและออกแล้ว',
  'Total VAT': 'VAT รวม',
  '7% included': 'รวม 7% แล้ว',
  'Average Ticket': 'ค่าเฉลี่ยต่อบิล',
  'Per transaction': 'ต่อธุรกรรม',
  'Parking Fees': 'ค่าจอดรถ',
  'Lost Card Fees': 'ค่าบัตรหาย',
  'Overnight Fees': 'ค่าจอดค้างคืน',
  'Total Entries': 'รถเข้าทั้งหมด',
  'Vehicles in': 'รถเข้า',
  'Total Exits': 'รถออกทั้งหมด',
  'Vehicles out': 'รถออก',
  'Currently Inside': 'อยู่ภายในขณะนี้',
  'Not yet exited': 'ยังไม่ออก',
  'Peak Hour': 'ชั่วโมงพีค',
  'Busiest entry hour': 'ชั่วโมงที่รถเข้ามากสุด',
  'Total Stamps': 'แสตมป์ทั้งหมด',
  'Validations issued': 'จำนวนการประทับตรา',
  'Total Companies': 'บริษัททั้งหมด',
  'Active tenants': 'ผู้เช่าที่ใช้งาน',
  'Total Fees': 'ค่าธรรมเนียมรวม',
  'Tenant + visitor': 'ผู้เช่า + ผู้มาติดต่อ',
  'Average Duration': 'ระยะเวลาเฉลี่ย',
  'Per stamped visit': 'ต่อการเข้าที่มีแสตมป์',
  'Tenant Paid': 'ผู้เช่าจ่าย',
  'Absorbed by tenants': 'ผู้เช่ารับภาระ',
  'Visitor Paid': 'ผู้มาติดต่อจ่าย',
  'Paid by visitors': 'จ่ายโดยผู้มาติดต่อ',
  'Total Vehicles In': 'รถเข้าทั้งหมด',
  'Entries': 'เข้า',
  'Total Vehicles Out': 'รถออกทั้งหมด',
  'Exits': 'ออก',
  'Peak Accumulated': 'สะสมสูงสุด',
  'Max concurrent': 'สูงสุดพร้อมกัน',
  'Net Flow': 'กระแสสุทธิ',
  'In − Out': 'เข้า − ออก',
  'Regular Vehicles': 'รถประจำ',
  'Temporary Vehicles': 'รถชั่วคราว',
  'Total Opportunity Loss': 'ค่าเสียโอกาสรวม',
  'Potential revenue lost': 'รายได้ที่อาจเสียไป',
  'Total Vehicles': 'จำนวนรถ',
  'Stamped visits': 'การเข้าที่มีแสตมป์',
  'Average Loss / Vehicle': 'ค่าเสียโอกาสเฉลี่ย/คัน',
  'Per stamped vehicle': 'ต่อรถที่มีแสตมป์',
  'Tenant Revenue': 'รายได้จากผู้เช่า',
  'Paid by tenants': 'จ่ายโดยผู้เช่า',
  'Visitor Revenue': 'รายได้จากผู้มาติดต่อ',
  'Collected + potential': 'ที่เก็บได้ + ที่อาจได้',

  // panel titles / subs
  'Hourly Revenue': 'รายได้รายชั่วโมง',
  'Collected fees by hour of day': 'ค่าธรรมเนียมที่เก็บได้ตามชั่วโมง',
  'Payment Methods': 'ช่องทางชำระเงิน',
  'Share of transactions': 'สัดส่วนของธุรกรรม',
  'Recent Transactions': 'ธุรกรรมล่าสุด',
  'Latest paid exits': 'รายการออกที่ชำระล่าสุด',
  'Status Breakdown': 'สรุปตามสถานะ',
  'Exit completion of entries': 'สัดส่วนการออกของรถที่เข้า',
  'Hourly Traffic': 'ปริมาณรถรายชั่วโมง',
  'Entries vs exits by hour': 'เข้ากับออกตามชั่วโมง',
  'Card Types': 'ประเภทบัตร',
  'Member vs visitor entries': 'สมาชิกกับผู้มาติดต่อ',
  'Latest vehicle movements': 'การเคลื่อนไหวล่าสุด',
  'Hourly Usage': 'การใช้งานรายชั่วโมง',
  'Stamp validations by hour': 'การประทับตราตามชั่วโมง',
  'Top Companies': 'บริษัทอันดับต้น',
  'Share of stamp usage': 'สัดส่วนการใช้แสตมป์',
  'Stamp Codes': 'รหัสแสตมป์',
  'Usage by validation code': 'การใช้งานตามรหัส',
  'Recent Stamps': 'แสตมป์ล่าสุด',
  'Latest validations': 'การประทับตราล่าสุด',
  'In-Out Comparison by Time Period': 'เปรียบเทียบเข้า-ออกตามช่วงเวลา',
  'Vehicles in vs out by hour': 'รถเข้ากับออกตามชั่วโมง',
  'Vehicle Types': 'ประเภทรถ',
  'Regular vs temporary': 'รถประจำกับรถชั่วคราว',
  'Accumulated Trend': 'แนวโน้มสะสม',
  'Vehicles inside over time': 'จำนวนรถภายในตามเวลา',
  'Time Period Statistics': 'สถิติตามช่วงเวลา',
  'Per-hour in/out summary': 'สรุปเข้า/ออกรายชั่วโมง',
  'Revenue vs Opportunity Loss': 'รายได้กับค่าเสียโอกาส',
  'By company': 'ตามบริษัท',
  'Distribution by Stamp Code': 'การกระจายตามรหัสแสตมป์',
  'Loss share per code': 'สัดส่วนค่าเสียโอกาสต่อรหัส',
  'Top Loss Companies': 'บริษัทที่เสียโอกาสมากสุด',
  'Ranked by opportunity loss': 'จัดอันดับตามค่าเสียโอกาส',
  'Recent Losses': 'ค่าเสียโอกาสล่าสุด',
  'Highest per-vehicle loss': 'ค่าเสียโอกาสต่อคันสูงสุด',

  // legends / small
  'In': 'เข้า',
  'Out': 'ออก',
  'Member': 'สมาชิก',
  'Visitor': 'ผู้มาติดต่อ',
  'Regular': 'รถประจำ',
  'Temporary': 'รถชั่วคราว',
  'Tenant': 'ผู้เช่า',
  'Loss': 'ค่าเสียโอกาส',
  'txns': 'ธุรกรรม',
  'vehicles': 'คัน',
  'entries': 'คันเข้า',

  // table headers
  'Time': 'เวลา',
  'License Plate': 'ทะเบียนรถ',
  'Type': 'ประเภท',
  'Payment': 'การชำระ',
  'Amount': 'จำนวนเงิน',
  'Entry': 'เวลาเข้า',
  'Exit': 'เวลาออก',
  'Duration': 'ระยะเวลา',
  'Card No.': 'หมายเลขบัตร',
  'Status': 'สถานะ',
  'Code': 'รหัส',
  'Description': 'รายละเอียด',
  'Count': 'จำนวน',
  'Share': 'สัดส่วน',
  'Member / Card No.': 'สมาชิก / หมายเลขบัตร',
  'Stamp Rate': 'อัตราแสตมป์',
  'Company': 'บริษัท',
  'Vehicles': 'จำนวนรถ',
  'Opportunity Loss': 'ค่าเสียโอกาส',
  'Company Code': 'รหัสบริษัท',
  'Date': 'วันที่',
  'Total': 'รวม',
  'Pass': 'ผ่าน',
  'Fail': 'ผิดพลาด',
  'Pass %': 'เปอร์เซ็นต์ผ่าน',
  'Fail %': 'เปอร์เซ็นต์ผิดพลาด',
  'Stamp Code': 'รหัสแสตมป์',
  'Payment Method': 'ช่องทางชำระเงิน',
  'Channel': 'ช่องทาง',
  'Transactions': 'ธุรกรรม',
  'VAT': 'VAT',
  'Company Paid': 'บริษัทจ่าย',
  'Contact Paid': 'ผู้ติดต่อจ่าย',
  'Time Period': 'ช่วงเวลา',
  'Regular In': 'รถประจำเข้า',
  'Temp In': 'รถชั่วคราวเข้า',
  'Total In': 'รวมเข้า',
  'Total Out': 'รวมออก',
  'Member No.': 'หมายเลขสมาชิก',
  'Package': 'แพ็กเกจ',
  'Visits': 'จำนวนครั้ง',
  'Expiry': 'วันหมดอายุ',
  'Stamps': 'แสตมป์',
  'Fees': 'ค่าธรรมเนียม',
  'Vehicle Type': 'ประเภทรถ',
  'Tax Invoice': 'เลขที่ใบกำกับภาษี',
  'Parking Fee': 'ค่าจอดรถ',

  // pills
  'Exited': 'ออกแล้ว',
  'Inside': 'อยู่ภายใน',
  'Active': 'ใช้งาน',
  'Expired': 'หมดอายุ',
  'member': 'สมาชิก',
  'visitor': 'ผู้มาติดต่อ',
  'Online': 'ออนไลน์',
  'Cash': 'เงินสด',

  // report subtitles
  'VAT-inclusive parking revenue': 'รายได้ค่าจอดรวม VAT',
  'Vehicle entry / exit records': 'บันทึกการเข้า-ออกของรถ',
  'Validation usage by company & code': 'การใช้แสตมป์ตามบริษัทและรหัส',
  'Daily LPR accuracy': 'ความแม่นยำการอ่านป้ายทะเบียนรายวัน',
  'Loss from stamp validations': 'ค่าเสียโอกาสจากการใช้แสตมป์',
  'In / out by hour of day': 'เข้า / ออกตามชั่วโมง',
  'Member & visitor entry log': 'บันทึกการเข้าของสมาชิกและผู้มาติดต่อ',
  'Discount stamp validations': 'การประทับตราส่วนลด',
  'Membership packages & validity': 'แพ็กเกจสมาชิกและความถูกต้อง',
  'Payment method breakdown': 'สรุปตามช่องทางชำระเงิน',

  // report chart titles
  'Bar comparison by company': 'กราฟเปรียบเทียบตามบริษัท',
  'Volume by time period': 'ปริมาณตามช่วงเวลา',
  'Hourly statistics': 'สถิติรายชั่วโมง',
  'Hourly stamp usage': 'การใช้แสตมป์รายชั่วโมง',
  'Amount by payment method': 'จำนวนเงินตามช่องทางชำระเงิน',

  // report filter labels
  'Date range': 'ช่วงวันที่',
  'Vehicle type': 'ประเภทรถ',
  'Card type': 'ประเภทบัตร',
  'Payment method': 'ช่องทางชำระเงิน',
  'Card no.': 'หมายเลขบัตร',
  'License plate': 'ทะเบียนรถ',
  'Entry date range': 'ช่วงวันที่เข้า',
  'Pay by': 'ชำระโดย',
  'Stamp code': 'รหัสแสตมป์',
  'Search card no.': 'ค้นหาหมายเลขบัตร',
  'Transaction type': 'ประเภทธุรกรรม',

  // filter option values
  'All': 'ทั้งหมด',

  // packages
  'Monthly': 'รายเดือน',
  'Quarterly': 'รายไตรมาส',
  'Annual': 'รายปี',
  'VIP': 'วีไอพี',
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(KEY) || 'en')

  useEffect(() => {
    localStorage.setItem(KEY, lang)
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const value = useMemo(() => {
    const t = (s) => (lang === 'th' ? TH[s] ?? s : s)
    return { lang, setLang, toggle: () => setLang((l) => (l === 'en' ? 'th' : 'en')), t }
  }, [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
