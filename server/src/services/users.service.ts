import { hash } from 'bcrypt';
import { CreateUserDto } from '@dtos/users.dto';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import UserModel from '@models/users.model';
import { isEmpty } from '@utils/util';

class UserService {
  public users = UserModel;

  public async findAllUser(): Promise<User[]> {
    const rows = await this.users.findAll();
    return rows.map(r => r.get({ plain: true }));
  }

  public async findUserById(userId: string): Promise<User> {
    if (isEmpty(userId)) throw new HttpException(400, "UserId is empty");

    const id = Number(userId);
    if (Number.isNaN(id)) throw new HttpException(400, "UserId is invalid");

    const findUser = await this.users.findByPk(id);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    return findUser.get({ plain: true });
  }

  public async createUser(userData: CreateUserDto): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, "userData is empty");

    const existing = await this.users.findOne({ where: { email: userData.email } });
    if (existing) throw new HttpException(409, `This email ${userData.email} already exists`);

    const hashedPassword = await hash(userData.password, 10);
    const created = await this.users.create({ ...userData, password: hashedPassword });

    return created.get({ plain: true });
  }

  public async updateUser(userId: string, userData: CreateUserDto): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, "userData is empty");

    const id = Number(userId);
    if (Number.isNaN(id)) throw new HttpException(400, "UserId is invalid");

    const user = await this.users.findByPk(id);
    if (!user) throw new HttpException(409, "User doesn't exist");

    if (userData.email) {
      const other = await this.users.findOne({ where: { email: userData.email } });
      if (other && other.id !== id) throw new HttpException(409, `This email ${userData.email} already exists`);
    }

    let nextPassword = userData.password;
    if (userData.password) {
      nextPassword = await hash(userData.password, 10);
    }

    await user.update({
      ...(userData.email !== undefined && { email: userData.email }),
      ...(userData.password !== undefined && { password: nextPassword }),
    });

    await user.reload();
    return user.get({ plain: true });
  }

  public async deleteUser(userId: string): Promise<User> {
    const id = Number(userId);
    if (Number.isNaN(id)) throw new HttpException(400, "UserId is invalid");

    const user = await this.users.findByPk(id);
    if (!user) throw new HttpException(409, "User doesn't exist");

    const plain = user.get({ plain: true });
    await user.destroy();
    return plain;
  }
}

export default UserService;
