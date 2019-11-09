Taste('this is a test')
.test((test) => {
    test.sample();
    test.expect(val).toBe(5)
    test.expect(foo).toBe(0)
})
.test(() => {
    
})
.expect().toBe()
.expect().toBe()

Taste('this is a test')
.test(profile => new Promise((resolve, reject) {
    profile.asyncresult = true;
}))
.expect('value').toEqual(5);
