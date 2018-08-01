package main

// import "fmt"

// type SendRecvEventAction struct {
// 	Metadata Metadata `yaml:"metadata"`
// 	Spec     struct {
// 		Send SendEventSpec `yaml:"send"`
// 		Recv RecvEventSpec `yaml:"recv"`
// 	} `yaml:"spec"`
// }

// func (act *SendRecvEventAction) Name() string {
// 	return act.Metadata.Name
// }

// func (act *SendRecvEventAction) Type() string {
// 	return "SendRecvEvent"
// }

// func (act *SendRecvEventAction) Prepare() error {
// 	if len(act.Metadata.Name) == 0 {
// 		act.Metadata.Name = fmt.Sprintf("%s_%s", act.Type(), act.Spec.Send.EventName)
// 	}

// 	// for i := range act.Spec.Send.Params {

// 	// 	vt := act.Spec.Send.Params[i].ValueType
// 	// 	if len(vt) == 0 {
// 	// 		vt = "String"
// 	// 	}

// 	// 	consantValue := act.Spec.Send.Params[i].Constant
// 	// 	if len(consantValue) > 0 {
// 	// 		// 用常量来赋值
// 	// 		switch vt {
// 	// 		case "Int32":
// 	// 			act.Spec.Send.Params[i].Value = consantValue
// 	// 			break
// 	// 		case "Symbol":
// 	// 			act.Spec.Send.Params[i].Value = consantValue
// 	// 			break
// 	// 		case "String":
// 	// 			act.Spec.Send.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
// 	// 			break
// 	// 		default:
// 	// 			glog.Fatalf("no such type %s\n", vt)
// 	// 		}

// 	// 		continue
// 	// 	}

// 	// 	valueFrom := act.Spec.Send.Params[i].ValueFrom
// 	// 	if len(valueFrom) > 0 {
// 	// 		// get value from player data
// 	// 		act.Spec.Send.Params[i].Value = "1"
// 	// 		continue
// 	// 	}
// 	// }

// 	s := &act.Spec.Send
// 	err := s.Prepare()
// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }

// func (act *SendRecvEventAction) GenerateCode() error {
// 	return generateEventAction(act)
// }
