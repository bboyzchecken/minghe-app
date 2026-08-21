package validator

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

// Validator ห่อ go-playground/validator ให้เข้ากับ echo.Validator
type Validator struct {
	validate *validator.Validate
}

func New() *Validator {
	return &Validator{validate: validator.New()}
}

// FieldError อธิบายข้อผิดพลาดรายฟิลด์ให้ client นำไปแสดงข้างช่องกรอกได้
type FieldError struct {
	Field   string `json:"field"`
	Rule    string `json:"rule"`
	Message string `json:"message"`
}

type ValidationError struct {
	Message string       `json:"error"`
	Fields  []FieldError `json:"fields"`
}

func (v *Validator) Validate(i any) error {
	err := v.validate.Struct(i)
	if err == nil {
		return nil
	}

	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return err
	}

	fields := make([]FieldError, 0, len(validationErrors))
	for _, fe := range validationErrors {
		fields = append(fields, FieldError{
			Field:   fe.Field(),
			Rule:    fe.Tag(),
			Message: message(fe),
		})
	}
	return &ValidationError{Message: "validation failed", Fields: fields}
}

// Error ทำให้ ValidationError ใช้เป็น error ได้ตรง ๆ และ handler ส่งกลับเป็น JSON ได้
func (e *ValidationError) Error() string { return e.Message }

func message(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "จำเป็นต้องระบุ"
	case "email":
		return "รูปแบบอีเมลไม่ถูกต้อง"
	case "min":
		return fmt.Sprintf("ต้องมีอย่างน้อย %s", fe.Param())
	case "max":
		return fmt.Sprintf("ต้องไม่เกิน %s", fe.Param())
	case "oneof":
		return fmt.Sprintf("ต้องเป็นค่าใดค่าหนึ่งใน: %s", fe.Param())
	case "datetime":
		return fmt.Sprintf("รูปแบบต้องเป็น %s", fe.Param())
	default:
		return "ค่าไม่ถูกต้อง"
	}
}
